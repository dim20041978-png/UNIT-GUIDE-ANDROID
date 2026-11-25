"""Embed catalog photos from the inspected UNI-T UTi260B product flyer.
The source is a manufacturer's branded catalog sheet hosted by UNI-T's Korean distributor.
Crops are normalized to the full page to avoid mixing in other models.
"""
import base64
import pathlib
import sys
import fitz

pdf = pathlib.Path(sys.argv[1])
target = pathlib.Path(sys.argv[2])
with fitz.open(pdf) as doc:
    assert len(doc) == 1, "Unexpected product flyer page count"
    page = doc[0]
    text = page.get_text()
    assert "UTi260B" in text and "256x192" in text.replace(" ", ""), "Wrong model flyer"
    w, h = page.rect.width, page.rect.height
    # Coordinates match inspected catalog: screen-side and angled lens-side photographs.
    crops = {"FRONT": (0.009,0.118,0.198,0.468), "REAR": (0.205,0.281,0.354,0.443)}
    html = target.read_text(encoding="utf-8")
    for name, (x0,y0,x1,y1) in crops.items():
        image = page.get_pixmap(matrix=fitz.Matrix(3,3), clip=fitz.Rect(x0*w,y0*h,x1*w,y1*h), alpha=False)
        assert image.width > 100 and image.height > 100, "Unexpected image dimensions"
        data = image.tobytes("png")
        assert len(data) > 5000, "Unexpected blank image"
        marker = "__UTI260B_" + name + "_DATA__"
        assert marker in html, "Missing placeholder"
        html = html.replace(marker, "data:image/png;base64," + base64.b64encode(data).decode("ascii"))
    assert "__UTI260B_" not in html
    target.write_text(html, encoding="utf-8")
    print("Embedded two UTi260B catalog photo crops into offline HTML")
