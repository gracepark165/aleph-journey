import re, json, unicodedata, sys
D=sys.argv[1]
js=open(D+'/strongs/hebrew.js',encoding='utf8').read()
strongs=json.loads(js[js.index('{'):js.rindex('}')+1])
refs={'Gen':['29.4','29.5','29.6','37.15','37.16'],'Ruth':['1.16','2.4'],'1Sam':['3.4','3.5','17.58'],'1Kgs':['17.10','17.11'],'Hos':['6.1'],'Jonah':['1.8','1.9']}
clean=lambda w: unicodedata.normalize('NFC',re.sub('[֑-ֽ֯]','',w))
out={}
for b,vs in refs.items():
    s=open(f'{D}/oshb/{b}.xml',encoding='utf8').read()
    for v in vs:
        m=re.search(r'<verse osisID="%s\.%s">(.*?)</verse>'%(b,v), s, re.S)
        toks=[]
        for part in re.finditer(r'<w ([^>]*)>([^<]*)</w>|<seg type="x-maqqef">', m.group(1)):
            if part.group(1) is None: toks.append('־'); continue
            a=part.group(1); w=part.group(2)
            lem=re.search(r'lemma="([^"]*)"',a).group(1); mo=re.search(r'morph="([^"]*)"',a).group(1)
            # main lemma = last segment containing digits
            nums=[re.search(r'\d+',x).group(0) for x in lem.split('/') if re.search(r'\d+',x)]
            main=('H'+nums[-1]) if nums else None
            toks.append({'surface':clean(w).replace('/',''),'parts':clean(w),'lemma':lem,'main':main,'morph':mo,'head':strongs.get(main,{}).get('lemma'),'kjv':strongs.get(main,{}).get('kjv_def','')[:40]})
        out[f'{b} {v}']=toks
json.dump(out,open(D+'/verses.json','w'),ensure_ascii=False,indent=1)
for k,t in out.items():
    print('##',k,' '.join(x if isinstance(x,str) else x['surface'] for x in t))
    for x in t:
        if isinstance(x,str): continue
        print('  ',x['surface'],x['main'],x['morph'],x['head'],'|',x['kjv'])
