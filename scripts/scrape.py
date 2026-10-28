import json, os, re, urllib.parse, datetime
import requests
from bs4 import BeautifulSoup, NavigableString, Tag

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC = os.path.join(ROOT, "public", "images")
DATA = os.path.join(ROOT, "src", "data", "content.json")

UA = "cyberpunk-site/0.1 (contact: you@example.com; +https://example.com)"
API = "https://en.wikipedia.org/w/api.php?action=parse&page=Cyberpunk&prop=text|sections|revid&format=json&formatversion=2&redirects=1"
ARTICLE = "https://en.wikipedia.org/wiki/Cyberpunk"

ALLOWED_TAGS = {"p","a","b","i","em","strong","ul","ol","li","blockquote","figure","figcaption","img","sup","sub","br","span","table","thead","tbody","tr","th","td","h3","h4"}
ALLOWED_ATTRS = {"href","src","alt","id","width","height"}

def fetch():
    # try API first
    try:
        r = requests.get(API, headers={"User-Agent": UA}, timeout=30)
        if r.status_code == 200:
            d = r.json()
            html = d["parse"]["text"]
            revid = d["parse"]["revid"]
            print("Used API")
            return html, revid
    except Exception as e:
        print("API failed:", e)
    # fallback
    r = requests.get(ARTICLE, headers={"User-Agent": UA}, timeout=30)
    r.raise_for_status()
    m = re.search(r'"wgRevisionId"\s*:\s*(\d+)', r.text)
    revid = int(m.group(1)) if m else 0
    print("Used rendered page fallback")
    return r.text, revid

def clean_tree(node):
    if isinstance(node, NavigableString):
        return str(node)
    if not isinstance(node, Tag):
        return ""
    if node.name in ("style","script","nav"):
        return ""
    cls = " ".join(node.get("class", []))
    new_children = []
    for c in list(node.children):
        if isinstance(c, Tag):
            if c.name in ("style","script"):
                continue
            if "mw-editsection" in " ".join(c.get("class",[])):
                continue
            if c.name == "div" and "navbox" in " ".join(c.get("class",[])):
                continue
            if c.name == "div" and "hatnote" in " ".join(c.get("class",[])):
                continue
            if c.name == "div" and "toc" in " ".join(c.get("class",[])):
                continue
            if c.name in ("span","div") and "citation-needed" in " ".join(c.get("class",[])):
                continue
        new_children.append(c)
    if node.name not in ALLOWED_TAGS:
        out = ""
        for c in new_children:
            out += clean_tree(c)
        return out
    # unwrap empty spans
    if node.name == "span":
        inner = "".join(clean_tree(c) for c in new_children).strip()
        if not inner:
            return ""
    attrs = {}
    for k,v in node.attrs.items():
        if k not in ALLOWED_ATTRS:
            continue
        if k == "id" and str(v).startswith("mw"):
            continue
        attrs[k] = v
    if node.name == "a" and node.get("href"):
        h = node["href"]
        if h.startswith("/wiki/"):
            h = "https://en.wikipedia.org" + h
        attrs["href"] = h
    inner = ""
    for c in new_children:
        inner += clean_tree(c)
    attr_str = "".join(f' {k}="{v}"' if not isinstance(v,list) else f' {k}="{" ".join(v)}"' for k,v in attrs.items())
    if node.name == "br":
        return "<br>"
    if node.name == "img":
        return f"<img{attr_str}>"
    if node.name == "span":
        inner2 = inner.strip()
        if not inner2:
            return ""
        return f"<span{attr_str}>{inner}</span>"
    return f"<{node.name}{attr_str}>{inner}</{node.name}>"

def slug(s):
    s = s.strip().lower()
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-") or "section"

def clean_filename(name):
    return re.sub(r"[^\w.\-]", "_", name)

def nearest_caption(img):
    # figcaption sibling/parent
    fig = img.find_parent("figure")
    if fig:
        fc = fig.find("figcaption")
        if fc:
            return fc.get_text(" ", strip=True)
    # next sibling text
    # parent td/th
    td = img.find_parent(["td","th","div"])
    # try following sibling
    sib = img.find_next_sibling()
    if sib and getattr(sib,"name",None) in ("figcaption","p","span"):
        t = sib.get_text(" ", strip=True)
        if t:
            return t
    return ""

def main():
    os.makedirs(PUBLIC, exist_ok=True)
    os.makedirs(os.path.join(ROOT, "src", "data"), exist_ok=True)
    html, revid = fetch()
    soup = BeautifulSoup(html, "html.parser")
    ct = soup.find("div", id="mw-content-text")
    content_div = None
    if ct:
        for d in ct.find_all("div", class_="mw-parser-output"):
            if d.find_all("h2"):
                content_div = d
                break
    if content_div is None:
        candidates = soup.find_all("div", class_="mw-parser-output")
        content_div = max(candidates, key=lambda d: len(d.find_all("h2"))) if candidates else soup

    for tag in content_div.find_all(["style","script"]):
        tag.decompose()
    for d in content_div.find_all("div", class_="navbox"):
        d.decompose()
    for d in content_div.find_all("div", class_="hatnote"):
        d.decompose()
    for d in content_div.find_all("div", class_="toc"):
        d.decompose()
    for s in content_div.find_all("span", class_="mw-editsection"):
        s.decompose()

    # short description
    short_desc = ""
    sd = content_div.find(["span","div"], class_="shortdescription")
    if sd:
        short_desc = sd.get_text(strip=True)
        sd.decompose()
    # also check meta description? keep simple

    # infobox
    infobox = content_div.find("table", class_=lambda c: c and "infobox" in " ".join(c if isinstance(c,list) else [c]))
    infobox_title = ""
    infobox_image = None
    infobox_rows = []
    if infobox:
        # title: caption or th with colspan / first th
        cap = infobox.find("caption")
        if cap:
            infobox_title = cap.get_text(strip=True)
        else:
            for th in infobox.find_all("th"):
                if th.get("colspan"):
                    infobox_title = th.get_text(strip=True)
                    break
            if not infobox_title:
                first_th = infobox.find("th")
                if first_th:
                    infobox_title = first_th.get_text(strip=True)
        # image
        img = infobox.find("img")
        if img:
            src = img.get("src","")
            if src.startswith("//"):
                src = "https:" + src
            # alt
            # prefer cleaned filename from src
            base = os.path.splitext(urllib.parse.unquote(src.split("/")[-1]))[0]
            base = re.sub(r"^\d+px-", "", base)
            alt = base.replace("_"," ").replace("-"," ").strip()
            # try source alt if sane
            src_alt = (img.get("alt") or "").strip().split("?")[0].strip()
            if src_alt and "utm" not in src_alt.lower() and not src_alt.lower().endswith((".jpg",".png",".gif",".svg",".jpeg")) and "px-" not in src_alt:
                alt = src_alt
            if not alt:
                alt = nearest_caption(img).strip()
            if not alt or "utm" in alt.lower():
                alt = infobox_title or "Cyberpunk"
            caption = ""
            fig = img.find_parent("figure")
            if fig:
                fc = fig.find("figcaption")
                if fc:
                    caption = fc.get_text(" ", strip=True)
            if not caption:
                td = img.find_parent("td")
                if td:
                    nxt = td.find_next_sibling("td")
                    if nxt:
                        caption = nxt.get_text(" ", strip=True)
            if not alt and caption:
                alt = caption
            if not alt:
                alt = infobox_title or "Cyberpunk"
            infobox_image = {"src": src, "alt": alt, "caption": caption}
        for tr in infobox.find_all("tr"):
            th = tr.find("th")
            td = tr.find("td")
            if th and td:
                # skip if th has colspan (title row)
                if th.get("colspan"):
                    continue
                label = th.get_text(strip=True)
                if not label:
                    continue
                infobox_rows.append({"label": label, "valueHtml": clean_tree(td)})
        infobox.decompose()

    # collect cite notes
    references = []
    seen_ids = set()
    for li in content_div.find_all("li", id=re.compile(r"^cite_note")):
        rid = li.get("id")
        if rid in seen_ids:
            continue
        seen_ids.add(rid)
        references.append({"id": rid, "html": clean_tree(li)})

    # sections
    # detect if content uses <section> wrappers
    has_sections = any(isinstance(c, Tag) and c.name == "section" and c.find("h2") for c in content_div.children)
    sections_raw = []
    lead_parts = []
    if has_sections:
        seen_first_section = False
        for c in content_div.children:
            if isinstance(c, NavigableString) and not str(c).strip():
                continue
            if isinstance(c, Tag) and c.name == "section":
                h2 = c.find("h2")
                if h2 is not None:
                    seen_first_section = True
                    sec_copy = BeautifulSoup(str(c), "html.parser").find("section")
                    h2c = sec_copy.find("h2")
                    if h2c:
                        h2c.decompose()
                    sections_raw.append((h2.get_text(strip=True), sec_copy))
                    continue
                else:
                    if not seen_first_section:
                        lead_parts.append(c)
                    continue
            if not seen_first_section:
                lead_parts.append(c)
    else:
        def heading_text(c):
            if isinstance(c, Tag):
                if c.name in ("h2","h3"):
                    return c.name, c.get_text(strip=True)
                if c.name == "div" and "mw-heading" in " ".join(c.get("class",[])):
                    h = c.find(["h2","h3"])
                    if h:
                        return h.name, h.get_text(strip=True)
            return None, None
        current = None
        cur_nodes = []
        cur_sub = None
        cur_sub_nodes = []
        html_parts = []
        # We'll accumulate per section as list of (type, node)
        section_accum = []  # list of (title, list_of (kind,node))
        cur = None
        cur_list = None
        for c in content_div.children:
            if isinstance(c, NavigableString) and not str(c).strip():
                continue
            lvl, txt = heading_text(c)
            if lvl == "h2":
                if cur is not None:
                    section_accum.append((cur, cur_list))
                cur = txt
                cur_list = []
                continue
            if lvl == "h3":
                cur_list.append(("h3", c))
                continue
            if cur is None:
                lead_parts.append(c)
            else:
                cur_list.append(("node", c))
        if cur is not None:
            section_accum.append((cur, cur_list))
        # build pseudo-section nodes containing h3 and content in order
        for title, items in section_accum:
            sec = BeautifulSoup("<section></section>", "html.parser").find("section")
            for kind, c in items:
                if kind == "h3":
                    h = c.find("h3") if isinstance(c, Tag) and c.name == "div" else c
                    # append an h3 tag
                    h3_tag = BeautifulSoup("<h3></h3>", "html.parser").find("h3")
                    h3_tag.string = h.get_text(strip=True)
                    sec.append(h3_tag)
                else:
                    sec.append(c if isinstance(c, Tag) else NavigableString(str(c)))
            sections_raw.append((title, sec))
    lead_html = "".join(clean_tree(n) for n in lead_parts).strip()

    # build sections
    drop_names = {"References","Notes","Citations"}
    sections = []
    for title, node in sections_raw:
        if title in drop_names:
            continue
        nodes = list(node.children)
        if title.lower() == "see also":
            has_p = any(isinstance(n,Tag) and n.name=="p" for n in nodes)
            if not has_p:
                continue
        html_parts = []
        subsections = []
        cur_sub = None
        cur_nodes = []
        for n in nodes:
            if isinstance(n, NavigableString) and not str(n).strip():
                continue
            if isinstance(n, Tag) and n.name == "h3":
                if cur_sub:
                    cur_sub["nodes"] = cur_nodes
                    subsections.append(cur_sub)
                cur_sub = {"title": n.get_text(strip=True), "nodes": []}
                cur_nodes = []
                continue
            if cur_sub is None:
                html_parts.append(n)
            else:
                cur_nodes.append(n)
        if cur_sub:
            cur_sub["nodes"] = cur_nodes
            subsections.append(cur_sub)
        sec_html = "".join(clean_tree(n) for n in html_parts).strip()
        subs = []
        for s in subsections:
            subs.append({"id": slug(s["title"]), "title": s["title"], "html": "".join(clean_tree(n) for n in s["nodes"]).strip()})
        sections.append({"id": slug(title), "title": title, "html": sec_html, "subsections": subs})

    # unique ids
    seen = set()
    for s in sections:
        base = s["id"]
        i = 2
        while s["id"] in seen:
            s["id"] = f"{base}-{i}"; i+=1
        seen.add(s["id"])
        for sub in s["subsections"]:
            base = sub["id"]
            i = 2
            while sub["id"] in seen:
                sub["id"] = f"{base}-{i}"; i+=1
            seen.add(sub["id"])

    # images: download commons
    soup2 = BeautifulSoup(html, "html.parser")
    ct2 = soup2.find("div", id="mw-content-text")
    cd2 = None
    if ct2:
        for d in ct2.find_all("div", class_="mw-parser-output"):
            if d.find_all("img"):
                cd2 = d; break
    if cd2 is None:
        cands = soup2.find_all("div", class_="mw-parser-output")
        cd2 = max(cands, key=lambda d: len(d.find_all("img"))) if cands else soup2

    # helper to process an image tag into (src, alt, local_name, orig)
    def process_img(img):
        src = img.get("src","")
        if src.startswith("//"):
            src = "https:" + src
        if "/wikipedia/commons/" not in src:
            return None
        w = img.get("width")
        try:
            if w and int(w) < 120:
                return None
        except:
            pass
        low = src.lower()
        if "icon" in low or "flag" in low:
            return None
        path = urllib.parse.urlparse(src).path
        parts = path.split("/")
        orig = None
        for seg in reversed(parts):
            m = re.match(r"^\d+px-(.+)$", seg)
            if m:
                orig = m.group(1); break
        if not orig:
            for seg in reversed(parts):
                if not re.match(r"^\d+px-", seg) and "." in seg:
                    orig = seg; break
        if not orig:
            return None
        orig = urllib.parse.unquote(orig)
        local_name = clean_filename(orig)
        # alt
        alt = (img.get("alt") or "").strip()
        alt = alt.split("?")[0].strip()
        if not alt:
            alt = nearest_caption(img).strip()
        if not alt:
            base = os.path.splitext(orig)[0]
            alt = base.replace("_"," ").replace("-"," ")
        if not alt:
            alt = orig
        return src, alt, local_name, orig

    img_list = []
    dropped_noncommons = []
    mapping = {}
    # process all images in cd2
    for img in cd2.find_all("img"):
        src0 = img.get("src","")
        if src0.startswith("//"):
            src0 = "https:" + src0
        if "/wikipedia/commons/" not in src0:
            if "/wikipedia/en/" in src0:
                dropped_noncommons.append(src0)
            continue
        res = process_img(img)
        if res is None:
            # could be filtered by size/icon
            continue
        src, alt, local_name, orig = res
        local_path = os.path.join(PUBLIC, local_name)
        try:
            rr = requests.get(src, headers={"User-Agent": UA}, timeout=30)
            rr.raise_for_status()
            with open(local_path, "wb") as f:
                f.write(rr.content)
        except Exception as e:
            print("download failed", src, e)
            continue
        commons_url = "https://commons.wikimedia.org/wiki/File:" + urllib.parse.quote(orig.replace(" ","_"))
        img_list.append({"local": "/images/" + local_name, "alt": alt, "commonsUrl": commons_url})
        mapping[src] = "/images/" + local_name
        mapping["//" + src.replace("https://","")] = "/images/" + local_name

    # infobox image download
    if infobox_image:
        src = infobox_image["src"]
        if "/wikipedia/commons/" in src:
            # process
            # find img in cd2? not needed; just download
            path = urllib.parse.urlparse(src).path
            parts = path.split("/")
            orig = None
            for seg in reversed(parts):
                m = re.match(r"^\d+px-(.+)$", seg)
                if m:
                    orig = m.group(1); break
            if not orig:
                for seg in reversed(parts):
                    if not re.match(r"^\d+px-", seg) and "." in seg:
                        orig = seg; break
            if orig:
                orig = urllib.parse.unquote(orig)
                local_name = clean_filename(orig)
                local_path = os.path.join(PUBLIC, local_name)
                try:
                    rr = requests.get(src, headers={"User-Agent": UA}, timeout=30)
                    rr.raise_for_status()
                    with open(local_path, "wb") as f:
                        f.write(rr.content)
                except Exception as e:
                    print("infobox image download failed", src, e)
                alt = infobox_image["alt"]
                if (not alt) or alt == infobox_title or "utm" in alt.lower() or alt.lower().endswith((".jpg",".png",".gif")):
                    base = os.path.splitext(orig)[0]
                    base = re.sub(r"^\d+px-", "", base)
                    alt = base.replace("_"," ").replace("-"," ").strip()
                if not alt:
                    alt = infobox_image["caption"] or infobox_title or "Cyberpunk"
                commons_url = "https://commons.wikimedia.org/wiki/File:" + urllib.parse.quote(orig.replace(" ","_"))
                img_list.append({"local": "/images/" + local_name, "alt": alt, "commonsUrl": commons_url})
                mapping[src] = "/images/" + local_name
                mapping["//" + src.replace("https://","")] = "/images/" + local_name
                infobox_image_obj = {"local": "/images/" + local_name, "alt": alt, "caption": infobox_image["caption"]}
            else:
                infobox_image_obj = None
        else:
            infobox_image_obj = None
    else:
        infobox_image_obj = None

    # dedup images by local path
    seen_locals = set()
    deduped = []
    for im in img_list:
        if im["local"] in seen_locals:
            continue
        seen_locals.add(im["local"])
        deduped.append(im)
    img_list = deduped

    # rewrite src in html
    def rewrite(s):
        for remote, local in mapping.items():
            s = s.replace(remote, local)
        for remote, local in mapping.items():
            s = s.replace(remote.replace("https:",""), local)
        return s

    lead_html = rewrite(lead_html)
    for s in sections:
        s["html"] = rewrite(s["html"])
        for sub in s["subsections"]:
            sub["html"] = rewrite(sub["html"])
    for r in references:
        r["html"] = rewrite(r["html"])
    for row in infobox_rows:
        row["valueHtml"] = rewrite(row["valueHtml"])

    # build infobox object
    infobox_obj = {
        "title": infobox_title,
        "image": infobox_image_obj,
        "rows": [{"label": r["label"], "valueHtml": r["valueHtml"]} for r in infobox_rows],
    }

    content = {
        "meta": {
            "title": "Cyberpunk",
            "shortDescription": short_desc,
            "sourceUrl": "https://en.wikipedia.org/wiki/Cyberpunk",
            "revisionId": revid,
            "retrievedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
            "license": {"name":"CC BY-SA 4.0","url":"https://creativecommons.org/licenses/by-sa/4.0/"}
        },
        "lead": lead_html,
        "infobox": infobox_obj,
        "sections": sections,
        "references": references,
        "images": img_list
    }

    with open(DATA, "w", encoding="utf-8") as f:
        json.dump(content, f, ensure_ascii=False, indent=2)

    # assertions
    assert lead_html.strip(), "lead empty"
    assert len(sections) >= 8, f"only {len(sections)} sections"
    assert references, "no references"
    assert infobox_rows, "infobox empty"
    assert "<table" not in lead_html, "table in lead"
    assert 'id="mw' not in lead_html and "id='mw" not in lead_html
    # check no mw ids anywhere in serialized content
    serialized = json.dumps(content)
    assert 'id="mw' not in serialized and "id='mw" not in serialized, "mw id present"
    for im in img_list:
        assert im["alt"].strip(), f"empty alt for {im['local']}"
    for im in img_list:
        p = os.path.join(ROOT, "public", im["local"].lstrip("/"))
        assert os.path.exists(p), f"missing image {p}"
    allhtml = lead_html + " ".join(s["html"]+"".join(x["html"] for x in s["subsections"]) for s in sections)
    for m in re.finditer(r'src="(/images/[^"]+)"', allhtml):
        p = os.path.join(ROOT, "public", m.group(1).lstrip("/"))
        assert os.path.exists(p), f"missing image {p}"

    print("Sections:", len(sections))
    for s in sections:
        print(" -", s["title"])
    print("References:", len(references))
    print("Images:", len(img_list))
    print("Infobox title:", infobox_title)
    print("Infobox image:", infobox_image_obj)
    print("Infobox rows:")
    for r in infobox_rows:
        print("   -", r["label"])
    print("Short description:", short_desc)
    print("Lead (first 200):", lead_html[:200])
    print("Image alts:")
    for im in img_list:
        print("   ", im["local"], "->", im["alt"])
    total = sum(os.path.getsize(os.path.join(PUBLIC, i["local"].split("/")[-1])) for i in img_list)
    print("Image total bytes:", total)
    print("Dropped non-commons images:", len(dropped_noncommons))

if __name__ == "__main__":
    main()
