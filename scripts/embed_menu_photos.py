import base64, pathlib, sys, fitz
pdf, target = map(pathlib.Path, sys.argv[1:3])
boxes = [["MEAS",4,163,360,335,592],["PALETTE",4,1078,192,1236,405],["POINT",5,149,233,330,478],["MODE",5,815,204,959,399],["SETTINGS",6,391,163,554,383],["LANG",6,266,513,444,753],["UNIT",6,954,550,1111,761],["ALERT",7,283,151,423,340],["SCALE",7,283,487,423,675],["PARAMS",7,974,164,1114,352],["STRUCT",3,204,182,569,492],["PORTS",3,204,182,445,266],["DISPLAY",3,778,245,1335,623],["CAPTURE",10,287,585,418,761],["REPLAY",10,104,295,345,447],["USB",8,977,148,1125,348],["AUTOOFF",8,287,522,435,722],["AUTOSAVE",9,972,509,1092,670],["INFO",9,282,180,413,357]]
html = target.read_text(encoding="utf-8")
with fitz.open(pdf) as doc:
    assert len(doc) == 12, "Manual revision/page count mismatch"
    for key, page_index, x0, y0, x1, y1 in boxes:
        page = doc[page_index]
        w,h = page.rect.width,page.rect.height
        assert abs(w/h - 1416/962) < .03, "Unexpected manual layout"
        pix = page.get_pixmap(matrix=fitz.Matrix(3,3),clip=fitz.Rect(x0*w/1416,y0*h/962,x1*w/1416,y1*h/962),alpha=False)
        data = pix.tobytes("png")
        assert pix.width>100 and pix.height>100 and len(data)>3000, key
        marker="__MENU_"+key+"__"
        assert html.count(marker)==1, key
        html=html.replace(marker,"data:image/png;base64,"+base64.b64encode(data).decode("ascii"))
assert "__MENU_" not in html
target.write_text(html, encoding="utf-8")
print("Embedded",len(boxes),"menu images from UTi260B manual")
