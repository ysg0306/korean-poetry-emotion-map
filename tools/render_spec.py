"""Render the Markdown development specification as a Korean PDF."""
from pathlib import Path
import html
import re

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import SimpleDocTemplate, Paragraph, Table, TableStyle, Spacer, Preformatted, Flowable, KeepTogether, PageBreak

ROOT = Path(__file__).resolve().parents[1]
SOURCE = (ROOT / 'DEVELOPMENT_SPEC.md').read_text(encoding='utf-8-sig')
VERSION = re.search(r'버전 (\d+\.\d+)', SOURCE).group(1)
OUT = ROOT / 'output' / 'pdf' / f'시의결_개발명세서_v{VERSION}.pdf'
OUT.parent.mkdir(parents=True, exist_ok=True)
pdfmetrics.registerFont(TTFont('K', 'C:/Windows/Fonts/malgun.ttf'))
pdfmetrics.registerFont(TTFont('KB', 'C:/Windows/Fonts/malgunbd.ttf'))
pdfmetrics.registerFontFamily('K', normal='K', bold='KB', italic='K', boldItalic='KB')
INK = colors.HexColor('#252A28')
GREEN = colors.HexColor('#315A49')
RULE = colors.HexColor('#D8DFD8')
PALE = colors.HexColor('#F1F5F0')
W, H = A4
CW = W - 88
STYLES = {}
for key, size, leading, bold in [
    ('body',9.2,14.8,False), ('h1',30,39,True), ('sub',13,20,True),
    ('h2',14,21,True), ('h3',10.5,17,True), ('cell',8.1,12.8,False),
    ('th',8.1,12.8,True), ('bullet',9.2,14.8,False), ('code',8,12,False),
]:
    STYLES[key] = ParagraphStyle(key, fontName='KB' if bold else 'K',
        fontSize=size, leading=leading, wordWrap='CJK',
        textColor=GREEN if key in ('h1','h2','th') else INK,
        spaceAfter=0 if key in ('cell','th') else 6, allowWidows=0, allowOrphans=0)
for key in ('h1','sub','h2','h3'):
    STYLES[key].keepWithNext = True
    STYLES[key].spaceBefore = 12 if key in ('h2','h3') else 0
STYLES['bullet'].leftIndent = 11
STYLES['bullet'].firstLineIndent = -9
STYLES['bullet'].spaceAfter = 4

def inline(text):
    text = html.escape(text)
    text = re.sub(r'\[([^\]]+)\]\((https?://[^\s)]+)\)',
        lambda m: f'<link href="{m.group(2)}" color="#315A49"><u>{m.group(1)}</u></link>', text)
    text = re.sub(r'\*\*(.*?)\*\*', r'<b>\1</b>', text)
    return re.sub(r'`([^`]+)`', r'<font color="#315A49">\1</font>', text)

class Checkbox(Flowable):
    def __init__(self):
        super().__init__()
        self.width, self.height = 9, 12

    def draw(self):
        self.canv.setStrokeColor(GREEN)
        self.canv.setLineWidth(.6)
        self.canv.rect(1, 2, 7, 7)

class Wireframe(Flowable):
    def __init__(self):
        super().__init__()
        self.width, self.height = CW, 242

    def draw(self):
        c, w = self.canv, self.width
        def box(x, y, width, height, text, bold=False):
            c.setFillColor(PALE if bold else colors.white)
            c.setStrokeColor(RULE)
            c.roundRect(x, y, width, height, 4, fill=1, stroke=1)
            c.setFillColor(GREEN if bold else INK)
            c.setFont('KB' if bold else 'K', 8.2)
            c.drawString(x+9, y+height-16, text)
        box(0,212,w,27,'시의 결  /  시 읽기 · 전체 비교 · 내 시 분석',True)
        box(0,178,w,27,'작품 검색 · 시인 선택  /  작품 카드 가로 서가')
        left = w*.49
        box(0,83,left,88,'본문 읽기',True)
        box(left+9,83,w-left-9,88,'사전 분석 요약',True)
        c.setFont('K',8.1)
        c.setFillColor(INK)
        for j,t in enumerate(['제목 · 시인 · 발표 정보','전체 본문 · 감지 시어 강조','행 선택 → 근거 확인']):
            c.drawString(10,137-j*16,t)
        for j,t in enumerate(['지배 정서 · 감정 비율 8종','주제 · 작품 해석 3문장 이상','감지 근거의 양 · 원문 출처']):
            c.drawString(left+19,137-j*16,t)
        box(0,48,w,28,'행별 표·흐름 차트  /  감정 프로필 레이더')
        box(0,13,w,28,'시어 연결도  →  추천 3편  →  감정 엽서  →  출처')

def column_widths(rows):
    header = rows[0]
    if header[0]=='번호': return [34,175,55,69,69,CW-402]
    if header[0]=='k': return [53,51,CW-162,58]
    if header[0]=='완료': return [36,139,153,CW-328]
    if header[0]=='평가 항목': return [65,42,244,CW-351]
    if header[0]=='ID' and len(header)==4: return [38,35,74,CW-147]
    if header[0]=='ID': return [42,77,CW-119]
    if header[0]=='단계': return [34,88,CW-122]
    if header[0]=='구분' and len(header)==3: return [79,150,CW-229]
    if len(header)==2: return [93,CW-93]
    if len(header)==3: return [85,180,CW-265]
    return [CW/len(header)]*len(header)

def make_table(rows):
    cells = [[Checkbox() if v=='☐' else Paragraph(inline(v),STYLES['th' if i==0 else 'cell'])
        for v in row] for i,row in enumerate(rows)]
    table = Table(cells, colWidths=column_widths(rows), repeatRows=1, hAlign='LEFT')
    table.setStyle(TableStyle([
        ('VALIGN',(0,0),(-1,-1),'TOP'),
        ('BACKGROUND',(0,0),(-1,0),colors.HexColor('#E7EEE7')),
        ('ROWBACKGROUNDS',(0,1),(-1,-1),[colors.white,colors.HexColor('#F8FAF7')]),
        ('LINEBELOW',(0,0),(-1,0),.7,GREEN), ('LINEBELOW',(0,1),(-1,-1),.35,RULE),
        ('LEFTPADDING',(0,0),(-1,-1),7), ('RIGHTPADDING',(0,0),(-1,-1),7),
        ('TOPPADDING',(0,0),(-1,-1),6), ('BOTTOMPADDING',(0,0),(-1,-1),6),
    ]))
    return table

story, lines, i = [], SOURCE.splitlines(), 0
while i < len(lines):
    line = lines[i].strip()
    if not line:
        i += 1
        continue
    if line.startswith('```'):
        block = []
        i += 1
        while i<len(lines) and not lines[i].strip().startswith('```'):
            block.append(lines[i]); i+=1
        story.append(Wireframe() if block and block[0].startswith('[시의 결')
            else Preformatted('\n'.join(block),STYLES['code']))
        story.append(Spacer(1,8)); i+=1
        continue
    if line.startswith('|'):
        rows=[]
        while i<len(lines) and lines[i].strip().startswith('|'):
            row=[v.strip() for v in lines[i].strip().strip('|').split('|')]
            if not all(re.fullmatch(r':?-+:?',v) for v in row): rows.append(row)
            i+=1
        group = [make_table(rows), Spacer(1,8)]
        if len(rows) <= 10:
            if story and isinstance(story[-1], Paragraph) and story[-1].style.name in ('h2','h3'):
                group.insert(0, story.pop())
            story.append(KeepTogether(group))
        else:
            story.extend(group)
        continue
    if line.startswith('# '): story.append(Paragraph(inline(line[2:]),STYLES['h1']))
    elif line.startswith('## '): story.append(Paragraph(inline(line[3:]),STYLES['sub' if i==1 else 'h2']))
    elif line.startswith('### '):
        if line.startswith('### 15.1 '): story.append(PageBreak())
        story.append(Paragraph(inline(line[4:]),STYLES['h3']))
    elif line.startswith('- '): story.append(Paragraph('• '+inline(line[2:]),STYLES['bullet']))
    elif re.match(r'^\d+\. ',line): story.append(Paragraph(inline(line),STYLES['bullet']))
    else: story.append(Paragraph(inline(line),STYLES['body']))
    i+=1

class NumberedCanvas(canvas.Canvas):
    def __init__(self,*args,**kwargs):
        super().__init__(*args,**kwargs)
        self.states=[]

    def showPage(self):
        self.states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        total=len(self.states)
        for state in self.states:
            self.__dict__.update(state)
            self.saveState()
            self.setStrokeColor(RULE); self.setLineWidth(.5)
            self.line(44,43,W-44,43)
            self.setFillColor(colors.HexColor('#626B65')); self.setFont('K',7.5)
            self.drawString(44,28,f'시의 결 · 구현 전 개발 명세서 · v{VERSION}')
            self.drawRightString(W-44,28,f'{self._pageNumber} / {total}')
            self.restoreState()
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

SimpleDocTemplate(str(OUT),pagesize=A4,leftMargin=44,rightMargin=44,topMargin=42,bottomMargin=58,
    title=f'시의 결 · 개발 명세서 v{VERSION}', author='감성컴퓨팅 과제 개발 설계').build(story,canvasmaker=NumberedCanvas)

# Final page renders are intermediate QA files, not website assets.
import pypdfium2 as pdf
from PIL import Image,ImageOps,ImageDraw
document=pdf.PdfDocument(str(OUT))
qa=ROOT/'tmp/spec-qa'
qa.mkdir(parents=True,exist_ok=True)
for n in range(len(document)):
    document[n].render(scale=1.45).to_pil().save(qa/f'page-{n+1:02}.png')
for start in range(0,len(document),6):
    sheet=Image.new('RGB',(1320,1890),'#D7DBD7'); draw=ImageDraw.Draw(sheet)
    for j in range(min(6,len(document)-start)):
        thumb=ImageOps.contain(Image.open(qa/f'page-{start+j+1:02}.png'),(645,600))
        x,y=j%2*660,j//2*630
        draw.text((x+12,y+6),f'PAGE {start+j+1}',fill='black')
        sheet.paste(thumb,(x+8,y+24))
    sheet.save(qa/f'contact-{start//6+1:02}.png')
print(f'Output: {OUT}\nPages: {len(document)}')
