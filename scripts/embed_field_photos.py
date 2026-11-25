import base64, hashlib, io, json, pathlib, sys, time, urllib.request
from PIL import Image, ImageOps

manifest = json.loads(pathlib.Path(sys.argv[1]).read_text(encoding="utf-8"))
target = pathlib.Path(sys.argv[2])
html = target.read_text(encoding="utf-8")
assert len(manifest)==10 and len({x["id"] for x in manifest})==10
report = []
for item in manifest:
    url = item["url"]
    assert url.startswith("https://upload.wikimedia.org/wikipedia/commons/")
    for attempt in range(4):
        try:
            request = urllib.request.Request(url, headers={"User-Agent":"UNIT-Guide-Android/1.0.0 (https://github.com/dim20041978-png/UNIT-GUIDE-ANDROID; educational image attribution)"})
            with urllib.request.urlopen(request,timeout=45) as response:
                assert response.headers.get_content_type() in ("image/jpeg","image/png")
                raw = response.read(12*1024*1024+1)
            assert len(raw)<=12*1024*1024
            break
        except Exception:
            if attempt==3: raise
            time.sleep(5*(attempt+1))
    with Image.open(io.BytesIO(raw)) as image:
        assert image.size==(item["width"],item["height"]), item["id"]
        fmt = image.format
        image.verify()
    # MPO stores a primary JPEG plus auxiliary frames. Preserve the full original bytes.
    # Browsers decode the primary JPEG image; report the detected container format.
    mime = {"JPEG":"image/jpeg","MPO":"image/jpeg","PNG":"image/png"}[fmt]
    marker = "__FIELD_"+item["id"]+"__"
    assert html.count(marker)==1, marker
    html=html.replace(marker,"data:"+mime+";base64,"+base64.b64encode(raw).decode("ascii"))
    report.append({"id":item["id"],"sha256":hashlib.sha256(raw).hexdigest(),"format":fmt,"width":item["width"],"height":item["height"],"source":item["source"],"license":item["license"]})
    print("Verified original image bytes:",item["id"],item["width"],item["height"])
    time.sleep(1)
assert "__FIELD_" not in html
target.write_text(html,encoding="utf-8")
pathlib.Path("visual-check").mkdir(exist_ok=True)
pathlib.Path("visual-check/field-image-report.json").write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
