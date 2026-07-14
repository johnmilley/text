var ht=Object.defineProperty;var ut=(t,e,n)=>e in t?ht(t,e,{enumerable:!0,configurable:!0,writable:!0,value:n}):t[e]=n;var g=(t,e,n)=>ut(t,typeof e!="symbol"?e+"":e,n);import{rpc as E,DropboxError as Q,hasTag as X,upload as F,download as O,getMetadata as pt,mtimeOf as T,getMetadataOrNull as ve,listFolderAll as ft,listFolderContinue as dt,listFolderFull as gt}from"./client-sPgIIxgn.js";import{x as fr}from"./index-BD5fyEDa.js";const kt="text-dropbox",D="files",Z="kv";let Re=null;function de(){return Re??(Re=new Promise(t=>{try{const e=indexedDB.open(kt,1);e.onupgradeneeded=()=>{e.result.createObjectStore(D,{keyPath:"pathLower"}),e.result.createObjectStore(Z)},e.onsuccess=()=>t(e.result),e.onerror=()=>t(null)}catch{t(null)}})),Re}async function W(t,e,n){const r=await de();r&&await new Promise(s=>{try{const i=r.transaction(t,e);n(i.objectStore(t)),i.oncomplete=()=>s(),i.onerror=()=>s(),i.onabort=()=>s()}catch{s()}})}async function bt(){const t=await de();return t?new Promise(e=>{try{const n=t.transaction(D,"readonly").objectStore(D).getAll();n.onsuccess=()=>e(n.result),n.onerror=()=>e([])}catch{e([])}}):[]}const mt=t=>W(D,"readwrite",e=>e.put(t)),wt=t=>W(D,"readwrite",e=>e.delete(t)),Je=t=>W(D,"readwrite",e=>{e.delete(t),e.delete(IDBKeyRange.bound(`${t}/`,`${t}/￿`))});async function xt(t){const e=await de();return e?new Promise(n=>{try{const r=e.transaction(Z,"readonly").objectStore(Z).get(`cursor:${t}`);r.onsuccess=()=>n(r.result??null),r.onerror=()=>n(null)}catch{n(null)}}):null}const Te=(t,e)=>W(Z,"readwrite",n=>n.put(e,`cursor:${t}`)),yt=t=>W(Z,"readwrite",e=>e.delete(`cursor:${t}`)),Ve="pt.config",_t="text.config",St=()=>({quick_switch:"ctrl+p",new_note:"ctrl+n",daily_note:"ctrl+shift+d",open_folder:"ctrl+o",switch_folder:"ctrl+shift+o",search:"ctrl+shift+f",backlinks:"ctrl+shift+b",theme:"ctrl+shift+t",editor_font:"ctrl+shift+e",share:"ctrl+shift+s",config:"ctrl+,",shortcuts:"ctrl+/",toggle_sidebar:"ctrl+\\",new_tab:"ctrl+t",close_tab:"ctrl+w",next_tab:"ctrl+tab",prev_tab:"ctrl+shift+tab",new_window:"ctrl+shift+n",split:"ctrl+shift+\\",preview:"ctrl+shift+m",focus_tree:"ctrl+e",calendar:"ctrl+shift+c",zen:"alt+z"}),$t=()=>({theme:"pt-dark",font_size:15,ui_font_size:13,editor_font:"",editor_margin:24,line_width:80,line_numbers:!1,highlight_line:!0,vim_mode:!1,single_line_breaks:!1,root:null,recent_roots:[],pinned_roots:[],daily_dir:"daily",image_dir:"",sidebar_width:240,sidebar_right:!1,zen_sidebar:!1,zen_typewriter:!0,typewriter_anchor:"top",spellcheck:!1,preview_replaces_editor:!1,toolbar_capture:!0,toolbar_calendar:!0,toolbar_corkboard:!0,toolbar_scratchpad:!0,toolbar_preview:!0,toolbar_order:["capture","calendar","corkboard","scratchpad"],keys:St()});function vt(){const t=$t();try{const e=localStorage.getItem(Ve)??localStorage.getItem(_t);if(!e)return t;const n=JSON.parse(e);return{...t,...n,keys:{...t.keys,...n.keys??{}}}}catch{return t}}function Rt(t){localStorage.setItem(Ve,JSON.stringify(t))}const Tt=new RegExp("(?:^|[\\s([{])#([\\p{L}\\p{N}/_-]*\\p{L}[\\p{L}\\p{N}/_-]*)","gu"),Ct=/^\s*(?:[-*+]|\d+[.)])\s+\[( |x|X)\]\s+(.*)$/;function zt(t){var o;const e={},n=[],r=[],s=t.split(`
`);let i=0;if(((o=s[0])==null?void 0:o.trim())==="---")for(i=1;i<s.length;i++){const a=s[i].trim();if(a==="---"||a==="..."){i++;break}const h=a.indexOf(":");if(h<0)continue;const c=a.slice(0,h).trim().toLowerCase(),u=a.slice(h+1).trim().replace(/^["']|["']$/g,"");if(!(!c||c.includes(" "))){if(c==="tags")for(const f of u.split(/[, ]/)){const m=f.trim().replace(/^#/,"").toLowerCase();m&&!n.includes(m)&&n.push(m)}e[c]=u}}let l=null;for(;i<s.length;i++){const a=s[i],h=a.trimStart();if(l){h.startsWith(l)&&(l=null);continue}if(h.startsWith("```")||h.startsWith("~~~")){l=h.slice(0,3);continue}for(const u of a.matchAll(Tt)){const f=u[1].toLowerCase();n.includes(f)||n.push(f)}const c=Ct.exec(a);c&&r.push({text:c[2].trim(),done:c[1]!==" ",line:i+1})}return{fields:e,tags:n,tasks:r}}const Lt=t=>/\.(md|markdown|mdown)$/i.test(t);function ge(){return{async:!1,breaks:!1,extensions:null,gfm:!0,hooks:null,pedantic:!1,renderer:null,silent:!1,tokenizer:null,walkTokens:null}}var M=ge();function Ge(t){M=t}var A={exec:()=>null};function P(t){let e=[];return n=>{let r=Math.max(0,Math.min(3,n-1)),s=e[r];return s||(s=t(r),e[r]=s),s}}function d(t,e=""){let n=typeof t=="string"?t:t.source,r={replace:(s,i)=>{let l=typeof i=="string"?i:i.source;return l=l.replace(x.caret,"$1"),n=n.replace(s,l),r},getRegex:()=>new RegExp(n,e)};return r}var At=((t="")=>{try{return!!new RegExp("(?<=1)(?<!1)"+t)}catch{return!1}})(),x={codeRemoveIndent:/^(?: {1,4}| {0,3}\t)/gm,outputLinkReplace:/\\([\[\]])/g,indentCodeCompensation:/^(\s+)(?:```)/,beginningSpace:/^\s+/,endingHash:/#$/,startingSpaceChar:/^ /,endingSpaceChar:/ $/,nonSpaceChar:/[^ ]/,newLineCharGlobal:/\n/g,tabCharGlobal:/\t/g,multipleSpaceGlobal:/\s+/g,blankLine:/^[ \t]*$/,doubleBlankLine:/\n[ \t]*\n[ \t]*$/,blockquoteStart:/^ {0,3}>/,blockquoteSetextReplace:/\n {0,3}((?:=+|-+) *)(?=\n|$)/g,blockquoteSetextReplace2:/^ {0,3}>[ \t]?/gm,listReplaceNesting:/^ {1,4}(?=( {4})*[^ ])/g,listIsTask:/^\[[ xX]\] +\S/,listReplaceTask:/^\[[ xX]\] +/,listTaskCheckbox:/\[[ xX]\]/,anyLine:/\n.*\n/,hrefBrackets:/^<(.*)>$/,tableDelimiter:/[:|]/,tableAlignChars:/^\||\| *$/g,tableRowBlankLine:/\n[ \t]*$/,tableAlignRight:/^ *-+: *$/,tableAlignCenter:/^ *:-+: *$/,tableAlignLeft:/^ *:-+ *$/,startATag:/^<a /i,endATag:/^<\/a>/i,startPreScriptTag:/^<(pre|code|kbd|script)(\s|>)/i,endPreScriptTag:/^<\/(pre|code|kbd|script)(\s|>)/i,startAngleBracket:/^</,endAngleBracket:/>$/,pedanticHrefTitle:/^([^'"]*[^\s])\s+(['"])(.*)\2/,unicodeAlphaNumeric:/[\p{L}\p{N}]/u,escapeTest:/[&<>"']/,escapeReplace:/[&<>"']/g,escapeTestNoEncode:/[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/,escapeReplaceNoEncode:/[<>"']|&(?!(#\d{1,7}|#[Xx][a-fA-F0-9]{1,6}|\w+);)/g,caret:/(^|[^\[])\^/g,percentDecode:/%25/g,findPipe:/\|/g,splitPipe:/ \|/,slashPipe:/\\\|/g,carriageReturn:/\r\n|\r/g,spaceLine:/^ +$/gm,notSpaceStart:/^\S*/,endingNewline:/\n$/,listItemRegex:t=>new RegExp(`^( {0,3}${t})((?:[	 ][^\\n]*)?(?:\\n|$))`),nextBulletRegex:P(t=>new RegExp(`^ {0,${t}}(?:[*+-]|\\d{1,9}[.)])((?:[ 	][^\\n]*)?(?:\\n|$))`)),hrRegex:P(t=>new RegExp(`^ {0,${t}}((?:- *){3,}|(?:_ *){3,}|(?:\\* *){3,})(?:\\n+|$)`)),fencesBeginRegex:P(t=>new RegExp(`^ {0,${t}}(?:\`\`\`|~~~)`)),headingBeginRegex:P(t=>new RegExp(`^ {0,${t}}#`)),htmlBeginRegex:P(t=>new RegExp(`^ {0,${t}}<(?:[a-z].*>|!--)`,"i")),blockquoteBeginRegex:P(t=>new RegExp(`^ {0,${t}}>`))},Bt=/^(?:[ \t]*(?:\n|$))+/,Mt=/^((?: {4}| {0,3}\t)[^\n]+(?:\n(?:[ \t]*(?:\n|$))*)?)+/,Et=/^ {0,3}(`{3,}(?=[^`\n]*(?:\n|$))|~{3,})([^\n]*)(?:\n|$)(?:|([\s\S]*?)(?:\n|$))(?: {0,3}\1[~`]* *(?=\n|$)|$)/,J=/^ {0,3}((?:-[\t ]*){3,}|(?:_[ \t]*){3,}|(?:\*[ \t]*){3,})(?:\n+|$)/,Pt=/^ {0,3}(#{1,6})(?=\s|$)(.*)(?:\n+|$)/,ke=/ {0,3}(?:[*+-]|\d{1,9}[.)])/,He=/^(?!bull |blockCode|fences|blockquote|heading|html|table)((?:.|\n(?!\s*?\n|bull |blockCode|fences|blockquote|heading|html|table))+?)\n {0,3}(=+|-+) *(?:\n+|$)/,Qe=d(He).replace(/bull/g,ke).replace(/blockCode/g,/(?: {4}| {0,3}\t)/).replace(/fences/g,/ {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g,/ {0,3}>/).replace(/heading/g,/ {0,3}#{1,6}/).replace(/html/g,/ {0,3}<[^\n>]+>\n/).replace(/\|table/g,"").getRegex(),Dt=d(He).replace(/bull/g,ke).replace(/blockCode/g,/(?: {4}| {0,3}\t)/).replace(/fences/g,/ {0,3}(?:`{3,}|~{3,})/).replace(/blockquote/g,/ {0,3}>/).replace(/heading/g,/ {0,3}#{1,6}/).replace(/html/g,/ {0,3}<[^\n>]+>\n/).replace(/table/g,/ {0,3}\|?(?:[:\- ]*\|)+[\:\- ]*\n/).getRegex(),be=/^([^\n]+(?:\n(?!hr|heading|lheading|blockquote|fences|list|html|table| +\n)[^\n]+)*)/,It=/^[^\n]+/,me=/(?!\s*\])(?:\\[\s\S]|[^\[\]\\])+/,qt=d(/^ {0,3}\[(label)\]: *(?:\n[ \t]*)?([^<\s][^\s]*|<.*?>)(?:(?: +(?:\n[ \t]*)?| *\n[ \t]*)(title))? *(?:\n+|$)/).replace("label",me).replace("title",/(?:"(?:\\"?|[^"\\])*"|'[^'\n]*(?:\n[^'\n]+)*\n?'|\([^()]*\))/).getRegex(),jt=d(/^(bull)([ \t][^\n]*?)?(?:\n|$)/).replace(/bull/g,ke).getRegex(),ne="address|article|aside|base|basefont|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|meta|nav|noframes|ol|optgroup|option|p|param|search|section|summary|table|tbody|td|tfoot|th|thead|title|tr|track|ul",we=/<!--(?:-?>|[\s\S]*?(?:-->|$))/,Ft=d("^ {0,3}(?:<(script|pre|style|textarea)[\\s>][\\s\\S]*?(?:</\\1>[^\\n]*\\n+|$)|comment[^\\n]*(\\n+|$)|<\\?[\\s\\S]*?(?:\\?>\\n*|$)|<![A-Z][\\s\\S]*?(?:>\\n*|$)|<!\\[CDATA\\[[\\s\\S]*?(?:\\]\\]>\\n*|$)|</?(tag)(?: +|\\n|/?>)[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|<(?!script|pre|style|textarea)([a-z][\\w-]*)(?:attribute)*? */?>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$)|</(?!script|pre|style|textarea)[a-z][\\w-]*\\s*>(?=[ \\t]*(?:\\n|$))[\\s\\S]*?(?:(?:\\n[ 	]*)+\\n|$))","i").replace("comment",we).replace("tag",ne).replace("attribute",/ +[a-zA-Z:_][\w.:-]*(?: *= *"[^"\n]*"| *= *'[^'\n]*'| *= *[^\s"'=<>`]+)?/).getRegex(),Xe=d(be).replace("hr",J).replace("heading"," {0,3}#{1,6}(?:\\s|$)").replace("|lheading","").replace("|table","").replace("blockquote"," {0,3}>").replace("fences"," {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list"," {0,3}(?:[*+-]|1[.)])[ \\t]+[^ \\t\\n]").replace("html","</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag",ne).getRegex(),Nt=d(/^( {0,3}> ?(paragraph|[^\n]*)(?:\n|$))+/).replace("paragraph",Xe).getRegex(),xe={blockquote:Nt,code:Mt,def:qt,fences:Et,heading:Pt,hr:J,html:Ft,lheading:Qe,list:jt,newline:Bt,paragraph:Xe,table:A,text:It},Ce=d("^ *([^\\n ].*)\\n {0,3}((?:\\| *)?:?-+:? *(?:\\| *:?-+:? *)*(?:\\| *)?)(?:\\n((?:(?! *\\n|hr|heading|blockquote|code|fences|list|html).*(?:\\n|$))*)\\n*|$)").replace("hr",J).replace("heading"," {0,3}#{1,6}(?:\\s|$)").replace("blockquote"," {0,3}>").replace("code","(?: {4}| {0,3}	)[^\\n]").replace("fences"," {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list"," {0,3}(?:[*+-]|1[.)])[ \\t]").replace("html","</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag",ne).getRegex(),Ot={...xe,lheading:Dt,table:Ce,paragraph:d(be).replace("hr",J).replace("heading"," {0,3}#{1,6}(?:\\s|$)").replace("|lheading","").replace("table",Ce).replace("blockquote"," {0,3}>").replace("fences"," {0,3}(?:`{3,}(?=[^`\\n]*\\n)|~{3,})[^\\n]*\\n").replace("list"," {0,3}(?:[*+-]|1[.)])[ \\t]+[^ \\t\\n]").replace("html","</?(?:tag)(?: +|\\n|/?>)|<(?:script|pre|style|textarea|!--)").replace("tag",ne).getRegex()},Zt={...xe,html:d(`^ *(?:comment *(?:\\n|\\s*$)|<(tag)[\\s\\S]+?</\\1> *(?:\\n{2,}|\\s*$)|<tag(?:"[^"]*"|'[^']*'|\\s[^'"/>\\s]*)*?/?> *(?:\\n{2,}|\\s*$))`).replace("comment",we).replace(/tag/g,"(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\\b)\\w+(?!:|[^\\w\\s@]*@)\\b").getRegex(),def:/^ *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +(["(][^\n]+[")]))? *(?:\n+|$)/,heading:/^(#{1,6})(.*)(?:\n+|$)/,fences:A,lheading:/^(.+?)\n {0,3}(=+|-+) *(?:\n+|$)/,paragraph:d(be).replace("hr",J).replace("heading",` *#{1,6} *[^
]`).replace("lheading",Qe).replace("|table","").replace("blockquote"," {0,3}>").replace("|fences","").replace("|list","").replace("|html","").replace("|tag","").getRegex()},Wt=/^\\([!"#$%&'()*+,\-./:;<=>?@\[\]\\^_`{|}~])/,Jt=/^(`+)([^`]|[^`][\s\S]*?[^`])\1(?!`)/,Ue=/^( {2,}|\\)\n(?!\s*$)/,Vt=/^(`+|[^`])(?:(?= {2,}\n)|[\s\S]*?(?:(?=[\\<!\[`*_]|\b_|$)|[^ ](?= {2,}\n)))/,I=/[\p{P}\p{S}]/u,re=/[\s\p{P}\p{S}]/u,ye=/[^\s\p{P}\p{S}]/u,Gt=d(/^((?![*_])punctSpace)/,"u").replace(/punctSpace/g,re).getRegex(),Ke=/(?!~)[\p{P}\p{S}]/u,Ht=/(?!~)[\s\p{P}\p{S}]/u,Qt=/(?:[^\s\p{P}\p{S}]|~)/u,Xt=d(/link|precode-code|html/,"g").replace("link",/\[(?:[^\[\]`]|(?<a>`+)[^`]+\k<a>(?!`))*?\]\((?:\\[\s\S]|[^\\\(\)]|\((?:\\[\s\S]|[^\\\(\)])*\))*\)/).replace("precode-",At?"(?<!`)()":"(^^|[^`])").replace("code",/(?<b>`+)[^`]+\k<b>(?!`)/).replace("html",/<(?! )[^<>]*?>/).getRegex(),Ye=/^(?:\*+(?:((?!\*)punct)|([^\s*]))?)|^_+(?:((?!_)punct)|([^\s_]))?/,Ut=d(Ye,"u").replace(/punct/g,I).getRegex(),Kt=d(Ye,"u").replace(/punct/g,Ke).getRegex(),et="^[^_*]*?__[^_*]*?\\*[^_*]*?(?=__)|[^*]+(?=[^*])|(?!\\*)punct(\\*+)(?=[\\s]|$)|notPunctSpace(\\*+)(?!\\*)(?=punctSpace|$)|(?!\\*)punctSpace(\\*+)(?=notPunctSpace)|[\\s](\\*+)(?!\\*)(?=punct)|(?!\\*)punct(\\*+)(?!\\*)(?=punct)|notPunctSpace(\\*+)(?=notPunctSpace)",Yt=d(et,"gu").replace(/notPunctSpace/g,ye).replace(/punctSpace/g,re).replace(/punct/g,I).getRegex(),en=d(et,"gu").replace(/notPunctSpace/g,Qt).replace(/punctSpace/g,Ht).replace(/punct/g,Ke).getRegex(),tn=d("^[^_*]*?\\*\\*[^_*]*?_[^_*]*?(?=\\*\\*)|[^_]+(?=[^_])|(?!_)punct(_+)(?=[\\s]|$)|notPunctSpace(_+)(?!_)(?=punctSpace|$)|(?!_)punctSpace(_+)(?=notPunctSpace)|[\\s](_+)(?!_)(?=punct)|(?!_)punct(_+)(?!_)(?=punct)","gu").replace(/notPunctSpace/g,ye).replace(/punctSpace/g,re).replace(/punct/g,I).getRegex(),nn=d(/^~~?(?:((?!~)punct)|[^\s~])/,"u").replace(/punct/g,I).getRegex(),rn="^[^~]+(?=[^~])|(?!~)punct(~~?)(?=[\\s]|$)|notPunctSpace(~~?)(?!~)(?=punctSpace|$)|(?!~)punctSpace(~~?)(?=notPunctSpace)|[\\s](~~?)(?!~)(?=punct)|(?!~)punct(~~?)(?!~)(?=punct)|notPunctSpace(~~?)(?=notPunctSpace)",sn=d(rn,"gu").replace(/notPunctSpace/g,ye).replace(/punctSpace/g,re).replace(/punct/g,I).getRegex(),an=d(/\\(punct)/,"gu").replace(/punct/g,I).getRegex(),on=d(/^<(scheme:[^\s\x00-\x1f<>]*|email)>/).replace("scheme",/[a-zA-Z][a-zA-Z0-9+.-]{1,31}/).replace("email",/[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+(@)[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+(?![-_])/).getRegex(),ln=d(we).replace("(?:-->|$)","-->").getRegex(),cn=d("^comment|^</[a-zA-Z][\\w:-]*\\s*>|^<[a-zA-Z][\\w-]*(?:attribute)*?\\s*/?>|^<\\?[\\s\\S]*?\\?>|^<![a-zA-Z]+\\s[\\s\\S]*?>|^<!\\[CDATA\\[[\\s\\S]*?\\]\\]>").replace("comment",ln).replace("attribute",/\s+[a-zA-Z:_][\w.:-]*(?:\s*=\s*"[^"]*"|\s*=\s*'[^']*'|\s*=\s*[^\s"'=<>`]+)?/).getRegex(),U=/(?:\[(?:\\[\s\S]|[^\[\]\\])*\]|\\[\s\S]|`+(?!`)[^`]*?`+(?!`)|``+(?=\])|[^\[\]\\`])*?/,hn=d(/^!?\[(label)\]\(\s*(href)(?:(?:[ \t]+(?:\n[ \t]*)?|\n[ \t]*)(title))?\s*\)/).replace("label",U).replace("href",/<(?:\\.|[^\n<>\\])+>|[^ \t\n\x00-\x1f]*/).replace("title",/"(?:\\"?|[^"\\])*"|'(?:\\'?|[^'\\])*'|\((?:\\\)?|[^)\\])*\)/).getRegex(),tt=d(/^!?\[(label)\]\[(ref)\]/).replace("label",U).replace("ref",me).getRegex(),nt=d(/^!?\[(ref)\](?:\[\])?/).replace("ref",me).getRegex(),un=d("reflink|nolink(?!\\()","g").replace("reflink",tt).replace("nolink",nt).getRegex(),ze=/[hH][tT][tT][pP][sS]?|[fF][tT][pP]/,_e={_backpedal:A,anyPunctuation:an,autolink:on,blockSkip:Xt,br:Ue,code:Jt,del:A,delLDelim:A,delRDelim:A,emStrongLDelim:Ut,emStrongRDelimAst:Yt,emStrongRDelimUnd:tn,escape:Wt,link:hn,nolink:nt,punctuation:Gt,reflink:tt,reflinkSearch:un,tag:cn,text:Vt,url:A},pn={..._e,link:d(/^!?\[(label)\]\((.*?)\)/).replace("label",U).getRegex(),reflink:d(/^!?\[(label)\]\s*\[([^\]]*)\]/).replace("label",U).getRegex()},ce={..._e,emStrongRDelimAst:en,emStrongLDelim:Kt,delLDelim:nn,delRDelim:sn,url:d(/^((?:protocol):\/\/|www\.)(?:[a-zA-Z0-9\-]+\.?)+[^\s<]*|^email/).replace("protocol",ze).replace("email",/[A-Za-z0-9._+-]+(@)[a-zA-Z0-9-_]+(?:\.[a-zA-Z0-9-_]*[a-zA-Z0-9])+(?![-_])/).getRegex(),_backpedal:/(?:[^?!.,:;*_'"~()&]+|\([^)]*\)|&(?![a-zA-Z0-9]+;$)|[?!.,:;*_'"~)]+(?!$))+/,del:/^(~~?)(?=[^\s~])((?:\\[\s\S]|[^\\])*?(?:\\[\s\S]|[^\s~\\]))\1(?=[^~]|$)/,text:d(/^([`~]+|[^`~])(?:(?= {2,}\n)|(?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)|[\s\S]*?(?:(?=[\\<!\[`*~_]|\b_|protocol:\/\/|www\.|$)|[^ ](?= {2,}\n)|[^a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-](?=[a-zA-Z0-9.!#$%&'*+\/=?_`{\|}~-]+@)))/).replace("protocol",ze).getRegex()},fn={...ce,br:d(Ue).replace("{2,}","*").getRegex(),text:d(ce.text).replace("\\b_","\\b_| {2,}\\n").replace(/\{2,\}/g,"*").getRegex()},G={normal:xe,gfm:Ot,pedantic:Zt},j={normal:_e,gfm:ce,breaks:fn,pedantic:pn},dn={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"},Le=t=>dn[t];function v(t,e){if(e){if(x.escapeTest.test(t))return t.replace(x.escapeReplace,Le)}else if(x.escapeTestNoEncode.test(t))return t.replace(x.escapeReplaceNoEncode,Le);return t}function Ae(t){try{t=encodeURI(t).replace(x.percentDecode,"%")}catch{return null}return t}function Be(t,e){var i;let n=t.replace(x.findPipe,(l,o,a)=>{let h=!1,c=o;for(;--c>=0&&a[c]==="\\";)h=!h;return h?"|":" |"}),r=n.split(x.splitPipe),s=0;if(r[0].trim()||r.shift(),r.length>0&&!((i=r.at(-1))!=null&&i.trim())&&r.pop(),e)if(r.length>e)r.splice(e);else for(;r.length<e;)r.push("");for(;s<r.length;s++)r[s]=r[s].trim().replace(x.slashPipe,"|");return r}function z(t,e,n){let r=t.length;if(r===0)return"";let s=0;for(;s<r&&t.charAt(r-s-1)===e;)s++;return t.slice(0,r-s)}function Me(t){let e=t.split(`
`),n=e.length-1;for(;n>=0&&x.blankLine.test(e[n]);)n--;return e.length-n<=2?t:e.slice(0,n+1).join(`
`)}function gn(t,e){if(t.indexOf(e[1])===-1)return-1;let n=0;for(let r=0;r<t.length;r++)if(t[r]==="\\")r++;else if(t[r]===e[0])n++;else if(t[r]===e[1]&&(n--,n<0))return r;return n>0?-2:-1}function kn(t,e=0){let n=e,r="";for(let s of t)if(s==="	"){let i=4-n%4;r+=" ".repeat(i),n+=i}else r+=s,n++;return r}function Ee(t,e,n,r,s){let i=e.href,l=e.title||null,o=t[1].replace(s.other.outputLinkReplace,"$1");r.state.inLink=!0;let a={type:t[0].charAt(0)==="!"?"image":"link",raw:n,href:i,title:l,text:o,tokens:r.inlineTokens(o)};return r.state.inLink=!1,a}function bn(t,e,n){let r=t.match(n.other.indentCodeCompensation);if(r===null)return e;let s=r[1];return e.split(`
`).map(i=>{let l=i.match(n.other.beginningSpace);if(l===null)return i;let[o]=l;return o.length>=s.length?i.slice(s.length):i}).join(`
`)}var K=class{constructor(t){g(this,"options");g(this,"rules");g(this,"lexer");this.options=t||M}space(t){let e=this.rules.block.newline.exec(t);if(e&&e[0].length>0)return{type:"space",raw:e[0]}}code(t){let e=this.rules.block.code.exec(t);if(e){let n=this.options.pedantic?e[0]:Me(e[0]),r=n.replace(this.rules.other.codeRemoveIndent,"");return{type:"code",raw:n,codeBlockStyle:"indented",text:r}}}fences(t){let e=this.rules.block.fences.exec(t);if(e){let n=e[0],r=bn(n,e[3]||"",this.rules);return{type:"code",raw:n,lang:e[2]?e[2].trim().replace(this.rules.inline.anyPunctuation,"$1"):e[2],text:r}}}heading(t){let e=this.rules.block.heading.exec(t);if(e){let n=e[2].trim();if(this.rules.other.endingHash.test(n)){let r=z(n,"#");(this.options.pedantic||!r||this.rules.other.endingSpaceChar.test(r))&&(n=r.trim())}return{type:"heading",raw:z(e[0],`
`),depth:e[1].length,text:n,tokens:this.lexer.inline(n)}}}hr(t){let e=this.rules.block.hr.exec(t);if(e)return{type:"hr",raw:z(e[0],`
`)}}blockquote(t){let e=this.rules.block.blockquote.exec(t);if(e){let n=z(e[0],`
`).split(`
`),r="",s="",i=[];for(;n.length>0;){let l=!1,o=[],a;for(a=0;a<n.length;a++)if(this.rules.other.blockquoteStart.test(n[a]))o.push(n[a]),l=!0;else if(!l)o.push(n[a]);else break;n=n.slice(a);let h=o.join(`
`),c=h.replace(this.rules.other.blockquoteSetextReplace,`
    $1`).replace(this.rules.other.blockquoteSetextReplace2,"");r=r?`${r}
${h}`:h,s=s?`${s}
${c}`:c;let u=this.lexer.state.top;if(this.lexer.state.top=!0,this.lexer.blockTokens(c,i,!0),this.lexer.state.top=u,n.length===0)break;let f=i.at(-1);if((f==null?void 0:f.type)==="code")break;if((f==null?void 0:f.type)==="blockquote"){let m=f,p=m.raw+`
`+n.join(`
`),y=this.blockquote(p);i[i.length-1]=y,r=r.substring(0,r.length-m.raw.length)+y.raw,s=s.substring(0,s.length-m.text.length)+y.text;break}else if((f==null?void 0:f.type)==="list"){let m=f,p=m.raw+`
`+n.join(`
`),y=this.list(p);i[i.length-1]=y,r=r.substring(0,r.length-f.raw.length)+y.raw,s=s.substring(0,s.length-m.raw.length)+y.raw,n=p.substring(i.at(-1).raw.length).split(`
`);continue}}return{type:"blockquote",raw:r,tokens:i,text:s}}}list(t){let e=this.rules.block.list.exec(t);if(e){let n=e[1].trim(),r=n.length>1,s={type:"list",raw:"",ordered:r,start:r?+n.slice(0,-1):"",loose:!1,items:[]};n=r?`\\d{1,9}\\${n.slice(-1)}`:`\\${n}`,this.options.pedantic&&(n=r?n:"[*+-]");let i=this.rules.other.listItemRegex(n),l=!1;for(;t;){let a=!1,h="",c="";if(!(e=i.exec(t))||this.rules.block.hr.test(t))break;h=e[0],t=t.substring(h.length);let u=kn(e[2].split(`
`,1)[0],e[1].length),f=t.split(`
`,1)[0],m=!u.trim(),p=0;if(this.options.pedantic?(p=2,c=u.trimStart()):m?p=e[1].length+1:(p=u.search(this.rules.other.nonSpaceChar),p=p>4?1:p,c=u.slice(p),p+=e[1].length),m&&this.rules.other.blankLine.test(f)&&(h+=f+`
`,t=t.substring(f.length+1),a=!0),!a){let y=this.rules.other.nextBulletRegex(p),w=this.rules.other.hrRegex(p),V=this.rules.other.fencesBeginRegex(p),L=this.rules.other.headingBeginRegex(p),ie=this.rules.other.htmlBeginRegex(p),ct=this.rules.other.blockquoteBeginRegex(p);for(;t;){let ae=t.split(`
`,1)[0],q;if(f=ae,this.options.pedantic?(f=f.replace(this.rules.other.listReplaceNesting,"  "),q=f):q=f.replace(this.rules.other.tabCharGlobal,"    "),V.test(f)||L.test(f)||ie.test(f)||ct.test(f)||y.test(f)||w.test(f))break;if(q.search(this.rules.other.nonSpaceChar)>=p||!f.trim())c+=`
`+q.slice(p);else{if(m||u.replace(this.rules.other.tabCharGlobal,"    ").search(this.rules.other.nonSpaceChar)>=4||V.test(u)||L.test(u)||w.test(u))break;c+=`
`+f}m=!f.trim(),h+=ae+`
`,t=t.substring(ae.length+1),u=q.slice(p)}}s.loose||(l?s.loose=!0:this.rules.other.doubleBlankLine.test(h)&&(l=!0)),s.items.push({type:"list_item",raw:h,task:!!this.options.gfm&&this.rules.other.listIsTask.test(c),loose:!1,text:c,tokens:[]}),s.raw+=h}let o=s.items.at(-1);if(o)o.raw=o.raw.trimEnd(),o.text=o.text.trimEnd();else return;s.raw=s.raw.trimEnd();for(let a of s.items){this.lexer.state.top=!1,a.tokens=this.lexer.blockTokens(a.text,[]);let h=a.tokens[0];if(a.task&&((h==null?void 0:h.type)==="text"||(h==null?void 0:h.type)==="paragraph")){a.text=a.text.replace(this.rules.other.listReplaceTask,""),h.raw=h.raw.replace(this.rules.other.listReplaceTask,""),h.text=h.text.replace(this.rules.other.listReplaceTask,"");for(let u=this.lexer.inlineQueue.length-1;u>=0;u--)if(this.rules.other.listIsTask.test(this.lexer.inlineQueue[u].src)){this.lexer.inlineQueue[u].src=this.lexer.inlineQueue[u].src.replace(this.rules.other.listReplaceTask,"");break}let c=this.rules.other.listTaskCheckbox.exec(a.raw);if(c){let u={type:"checkbox",raw:c[0]+" ",checked:c[0]!=="[ ]"};a.checked=u.checked,s.loose?a.tokens[0]&&["paragraph","text"].includes(a.tokens[0].type)&&"tokens"in a.tokens[0]&&a.tokens[0].tokens?(a.tokens[0].raw=u.raw+a.tokens[0].raw,a.tokens[0].text=u.raw+a.tokens[0].text,a.tokens[0].tokens.unshift(u)):a.tokens.unshift({type:"paragraph",raw:u.raw,text:u.raw,tokens:[u]}):a.tokens.unshift(u)}}else a.task&&(a.task=!1);if(!s.loose){let c=a.tokens.filter(f=>f.type==="space"),u=c.length>0&&c.some(f=>this.rules.other.anyLine.test(f.raw));s.loose=u}}if(s.loose)for(let a of s.items){a.loose=!0;for(let h of a.tokens)h.type==="text"&&(h.type="paragraph")}return s}}html(t){let e=this.rules.block.html.exec(t);if(e){let n=Me(e[0]);return{type:"html",block:!0,raw:n,pre:e[1]==="pre"||e[1]==="script"||e[1]==="style",text:n}}}def(t){let e=this.rules.block.def.exec(t);if(e){let n=e[1].toLowerCase().replace(this.rules.other.multipleSpaceGlobal," "),r=e[2]?e[2].replace(this.rules.other.hrefBrackets,"$1").replace(this.rules.inline.anyPunctuation,"$1"):"",s=e[3]?e[3].substring(1,e[3].length-1).replace(this.rules.inline.anyPunctuation,"$1"):e[3];return{type:"def",tag:n,raw:z(e[0],`
`),href:r,title:s}}}table(t){var l;let e=this.rules.block.table.exec(t);if(!e||!this.rules.other.tableDelimiter.test(e[2]))return;let n=Be(e[1]),r=e[2].replace(this.rules.other.tableAlignChars,"").split("|"),s=(l=e[3])!=null&&l.trim()?e[3].replace(this.rules.other.tableRowBlankLine,"").split(`
`):[],i={type:"table",raw:z(e[0],`
`),header:[],align:[],rows:[]};if(n.length===r.length){for(let o of r)this.rules.other.tableAlignRight.test(o)?i.align.push("right"):this.rules.other.tableAlignCenter.test(o)?i.align.push("center"):this.rules.other.tableAlignLeft.test(o)?i.align.push("left"):i.align.push(null);for(let o=0;o<n.length;o++)i.header.push({text:n[o],tokens:this.lexer.inline(n[o]),header:!0,align:i.align[o]});for(let o of s)i.rows.push(Be(o,i.header.length).map((a,h)=>({text:a,tokens:this.lexer.inline(a),header:!1,align:i.align[h]})));return i}}lheading(t){let e=this.rules.block.lheading.exec(t);if(e){let n=e[1].trim();return{type:"heading",raw:z(e[0],`
`),depth:e[2].charAt(0)==="="?1:2,text:n,tokens:this.lexer.inline(n)}}}paragraph(t){let e=this.rules.block.paragraph.exec(t);if(e){let n=e[1].charAt(e[1].length-1)===`
`?e[1].slice(0,-1):e[1];return{type:"paragraph",raw:e[0],text:n,tokens:this.lexer.inline(n)}}}text(t){let e=this.rules.block.text.exec(t);if(e)return{type:"text",raw:e[0],text:e[0],tokens:this.lexer.inline(e[0])}}escape(t){let e=this.rules.inline.escape.exec(t);if(e)return{type:"escape",raw:e[0],text:e[1]}}tag(t){let e=this.rules.inline.tag.exec(t);if(e)return!this.lexer.state.inLink&&this.rules.other.startATag.test(e[0])?this.lexer.state.inLink=!0:this.lexer.state.inLink&&this.rules.other.endATag.test(e[0])&&(this.lexer.state.inLink=!1),!this.lexer.state.inRawBlock&&this.rules.other.startPreScriptTag.test(e[0])?this.lexer.state.inRawBlock=!0:this.lexer.state.inRawBlock&&this.rules.other.endPreScriptTag.test(e[0])&&(this.lexer.state.inRawBlock=!1),{type:"html",raw:e[0],inLink:this.lexer.state.inLink,inRawBlock:this.lexer.state.inRawBlock,block:!1,text:e[0]}}link(t){let e=this.rules.inline.link.exec(t);if(e){let n=e[2].trim();if(!this.options.pedantic&&this.rules.other.startAngleBracket.test(n)){if(!this.rules.other.endAngleBracket.test(n))return;let i=z(n.slice(0,-1),"\\");if((n.length-i.length)%2===0)return}else{let i=gn(e[2],"()");if(i===-2)return;if(i>-1){let l=(e[0].indexOf("!")===0?5:4)+e[1].length+i;e[2]=e[2].substring(0,i),e[0]=e[0].substring(0,l).trim(),e[3]=""}}let r=e[2],s="";if(this.options.pedantic){let i=this.rules.other.pedanticHrefTitle.exec(r);i&&(r=i[1],s=i[3])}else s=e[3]?e[3].slice(1,-1):"";return r=r.trim(),this.rules.other.startAngleBracket.test(r)&&(this.options.pedantic&&!this.rules.other.endAngleBracket.test(n)?r=r.slice(1):r=r.slice(1,-1)),Ee(e,{href:r&&r.replace(this.rules.inline.anyPunctuation,"$1"),title:s&&s.replace(this.rules.inline.anyPunctuation,"$1")},e[0],this.lexer,this.rules)}}reflink(t,e){let n;if((n=this.rules.inline.reflink.exec(t))||(n=this.rules.inline.nolink.exec(t))){let r=(n[2]||n[1]).replace(this.rules.other.multipleSpaceGlobal," "),s=e[r.toLowerCase()];if(!s){let i=n[0].charAt(0);return{type:"text",raw:i,text:i}}return Ee(n,s,n[0],this.lexer,this.rules)}}emStrong(t,e,n=""){let r=this.rules.inline.emStrongLDelim.exec(t);if(!(!r||!r[1]&&!r[2]&&!r[3]&&!r[4]||r[4]&&n.match(this.rules.other.unicodeAlphaNumeric))&&(!(r[1]||r[3])||!n||this.rules.inline.punctuation.exec(n))){let s=[...r[0]].length-1,i,l,o=s,a=0,h=r[0][0]==="*"?this.rules.inline.emStrongRDelimAst:this.rules.inline.emStrongRDelimUnd;for(h.lastIndex=0,e=e.slice(-1*t.length+s);(r=h.exec(e))!==null;){if(i=r[1]||r[2]||r[3]||r[4]||r[5]||r[6],!i)continue;if(l=[...i].length,r[3]||r[4]){o+=l;continue}else if((r[5]||r[6])&&s%3&&!((s+l)%3)){a+=l;continue}if(o-=l,o>0)continue;l=Math.min(l,l+o+a);let c=[...r[0]][0].length,u=t.slice(0,s+r.index+c+l);if(Math.min(s,l)%2){let m=u.slice(1,-1);return{type:"em",raw:u,text:m,tokens:this.lexer.inlineTokens(m)}}let f=u.slice(2,-2);return{type:"strong",raw:u,text:f,tokens:this.lexer.inlineTokens(f)}}}}codespan(t){let e=this.rules.inline.code.exec(t);if(e){let n=e[2].replace(this.rules.other.newLineCharGlobal," "),r=this.rules.other.nonSpaceChar.test(n),s=this.rules.other.startingSpaceChar.test(n)&&this.rules.other.endingSpaceChar.test(n);return r&&s&&(n=n.substring(1,n.length-1)),{type:"codespan",raw:e[0],text:n}}}br(t){let e=this.rules.inline.br.exec(t);if(e)return{type:"br",raw:e[0]}}del(t,e,n=""){let r=this.rules.inline.delLDelim.exec(t);if(r&&(!r[1]||!n||this.rules.inline.punctuation.exec(n))){let s=[...r[0]].length-1,i,l,o=s,a=this.rules.inline.delRDelim;for(a.lastIndex=0,e=e.slice(-1*t.length+s);(r=a.exec(e))!==null;){if(i=r[1]||r[2]||r[3]||r[4]||r[5]||r[6],!i||(l=[...i].length,l!==s))continue;if(r[3]||r[4]){o+=l;continue}if(o-=l,o>0)continue;l=Math.min(l,l+o);let h=[...r[0]][0].length,c=t.slice(0,s+r.index+h+l),u=c.slice(s,-s);return{type:"del",raw:c,text:u,tokens:this.lexer.inlineTokens(u)}}}}autolink(t){let e=this.rules.inline.autolink.exec(t);if(e){let n,r;return e[2]==="@"?(n=e[1],r="mailto:"+n):(n=e[1],r=n),{type:"link",raw:e[0],text:n,href:r,tokens:[{type:"text",raw:n,text:n}]}}}url(t){var n;let e;if(e=this.rules.inline.url.exec(t)){let r,s;if(e[2]==="@")r=e[0],s="mailto:"+r;else{let i;do i=e[0],e[0]=((n=this.rules.inline._backpedal.exec(e[0]))==null?void 0:n[0])??"";while(i!==e[0]);r=e[0],e[1]==="www."?s="http://"+e[0]:s=e[0]}return{type:"link",raw:e[0],text:r,href:s,tokens:[{type:"text",raw:r,text:r}]}}}inlineText(t){let e=this.rules.inline.text.exec(t);if(e){let n=this.lexer.state.inRawBlock;return{type:"text",raw:e[0],text:e[0],escaped:n}}}},_=class he{constructor(e){g(this,"tokens");g(this,"options");g(this,"state");g(this,"inlineQueue");g(this,"tokenizer");this.tokens=[],this.tokens.links=Object.create(null),this.options=e||M,this.options.tokenizer=this.options.tokenizer||new K,this.tokenizer=this.options.tokenizer,this.tokenizer.options=this.options,this.tokenizer.lexer=this,this.inlineQueue=[],this.state={inLink:!1,inRawBlock:!1,top:!0};let n={other:x,block:G.normal,inline:j.normal};this.options.pedantic?(n.block=G.pedantic,n.inline=j.pedantic):this.options.gfm&&(n.block=G.gfm,this.options.breaks?n.inline=j.breaks:n.inline=j.gfm),this.tokenizer.rules=n}static get rules(){return{block:G,inline:j}}static lex(e,n){return new he(n).lex(e)}static lexInline(e,n){return new he(n).inlineTokens(e)}lex(e){e=e.replace(x.carriageReturn,`
`),this.blockTokens(e,this.tokens);for(let n=0;n<this.inlineQueue.length;n++){let r=this.inlineQueue[n];this.inlineTokens(r.src,r.tokens)}return this.inlineQueue=[],this.tokens}blockTokens(e,n=[],r=!1){var i,l,o;this.tokenizer.lexer=this,this.options.pedantic&&(e=e.replace(x.tabCharGlobal,"    ").replace(x.spaceLine,""));let s=1/0;for(;e;){if(e.length<s)s=e.length;else{this.infiniteLoopError(e.charCodeAt(0));break}let a;if((l=(i=this.options.extensions)==null?void 0:i.block)!=null&&l.some(c=>(a=c.call({lexer:this},e,n))?(e=e.substring(a.raw.length),n.push(a),!0):!1))continue;if(a=this.tokenizer.space(e)){e=e.substring(a.raw.length);let c=n.at(-1);a.raw.length===1&&c!==void 0?c.raw+=`
`:n.push(a);continue}if(a=this.tokenizer.code(e)){e=e.substring(a.raw.length);let c=n.at(-1);(c==null?void 0:c.type)==="paragraph"||(c==null?void 0:c.type)==="text"?(c.raw+=(c.raw.endsWith(`
`)?"":`
`)+a.raw,c.text+=`
`+a.text,this.inlineQueue.at(-1).src=c.text):n.push(a);continue}if(a=this.tokenizer.fences(e)){e=e.substring(a.raw.length),n.push(a);continue}if(a=this.tokenizer.heading(e)){e=e.substring(a.raw.length),n.push(a);continue}if(a=this.tokenizer.hr(e)){e=e.substring(a.raw.length),n.push(a);continue}if(a=this.tokenizer.blockquote(e)){e=e.substring(a.raw.length),n.push(a);continue}if(a=this.tokenizer.list(e)){e=e.substring(a.raw.length),n.push(a);continue}if(a=this.tokenizer.html(e)){e=e.substring(a.raw.length),n.push(a);continue}if(a=this.tokenizer.def(e)){e=e.substring(a.raw.length);let c=n.at(-1);(c==null?void 0:c.type)==="paragraph"||(c==null?void 0:c.type)==="text"?(c.raw+=(c.raw.endsWith(`
`)?"":`
`)+a.raw,c.text+=`
`+a.raw,this.inlineQueue.at(-1).src=c.text):this.tokens.links[a.tag]||(this.tokens.links[a.tag]={href:a.href,title:a.title},n.push(a));continue}if(a=this.tokenizer.table(e)){e=e.substring(a.raw.length),n.push(a);continue}if(a=this.tokenizer.lheading(e)){e=e.substring(a.raw.length),n.push(a);continue}let h=e;if((o=this.options.extensions)!=null&&o.startBlock){let c=1/0,u=e.slice(1),f;this.options.extensions.startBlock.forEach(m=>{f=m.call({lexer:this},u),typeof f=="number"&&f>=0&&(c=Math.min(c,f))}),c<1/0&&c>=0&&(h=e.substring(0,c+1))}if(this.state.top&&(a=this.tokenizer.paragraph(h))){let c=n.at(-1);r&&(c==null?void 0:c.type)==="paragraph"?(c.raw+=(c.raw.endsWith(`
`)?"":`
`)+a.raw,c.text+=`
`+a.text,this.inlineQueue.pop(),this.inlineQueue.at(-1).src=c.text):n.push(a),r=h.length!==e.length,e=e.substring(a.raw.length);continue}if(a=this.tokenizer.text(e)){e=e.substring(a.raw.length);let c=n.at(-1);(c==null?void 0:c.type)==="text"?(c.raw+=(c.raw.endsWith(`
`)?"":`
`)+a.raw,c.text+=`
`+a.text,this.inlineQueue.pop(),this.inlineQueue.at(-1).src=c.text):n.push(a);continue}if(e){this.infiniteLoopError(e.charCodeAt(0));break}}return this.state.top=!0,n}inline(e,n=[]){return this.inlineQueue.push({src:e,tokens:n}),n}inlineTokens(e,n=[]){var h,c,u,f,m;this.tokenizer.lexer=this;let r=e,s=null;if(this.tokens.links){let p=Object.keys(this.tokens.links);if(p.length>0)for(;(s=this.tokenizer.rules.inline.reflinkSearch.exec(r))!==null;)p.includes(s[0].slice(s[0].lastIndexOf("[")+1,-1))&&(r=r.slice(0,s.index)+"["+"a".repeat(s[0].length-2)+"]"+r.slice(this.tokenizer.rules.inline.reflinkSearch.lastIndex))}for(;(s=this.tokenizer.rules.inline.anyPunctuation.exec(r))!==null;)r=r.slice(0,s.index)+"++"+r.slice(this.tokenizer.rules.inline.anyPunctuation.lastIndex);let i;for(;(s=this.tokenizer.rules.inline.blockSkip.exec(r))!==null;)i=s[2]?s[2].length:0,r=r.slice(0,s.index+i)+"["+"a".repeat(s[0].length-i-2)+"]"+r.slice(this.tokenizer.rules.inline.blockSkip.lastIndex);r=((c=(h=this.options.hooks)==null?void 0:h.emStrongMask)==null?void 0:c.call({lexer:this},r))??r;let l=!1,o="",a=1/0;for(;e;){if(e.length<a)a=e.length;else{this.infiniteLoopError(e.charCodeAt(0));break}l||(o=""),l=!1;let p;if((f=(u=this.options.extensions)==null?void 0:u.inline)!=null&&f.some(w=>(p=w.call({lexer:this},e,n))?(e=e.substring(p.raw.length),n.push(p),!0):!1))continue;if(p=this.tokenizer.escape(e)){e=e.substring(p.raw.length),n.push(p);continue}if(p=this.tokenizer.tag(e)){e=e.substring(p.raw.length),n.push(p);continue}if(p=this.tokenizer.link(e)){e=e.substring(p.raw.length),n.push(p);continue}if(p=this.tokenizer.reflink(e,this.tokens.links)){e=e.substring(p.raw.length);let w=n.at(-1);p.type==="text"&&(w==null?void 0:w.type)==="text"?(w.raw+=p.raw,w.text+=p.text):n.push(p);continue}if(p=this.tokenizer.emStrong(e,r,o)){e=e.substring(p.raw.length),n.push(p);continue}if(p=this.tokenizer.codespan(e)){e=e.substring(p.raw.length),n.push(p);continue}if(p=this.tokenizer.br(e)){e=e.substring(p.raw.length),n.push(p);continue}if(p=this.tokenizer.del(e,r,o)){e=e.substring(p.raw.length),n.push(p);continue}if(p=this.tokenizer.autolink(e)){e=e.substring(p.raw.length),n.push(p);continue}if(!this.state.inLink&&(p=this.tokenizer.url(e))){e=e.substring(p.raw.length),n.push(p);continue}let y=e;if((m=this.options.extensions)!=null&&m.startInline){let w=1/0,V=e.slice(1),L;this.options.extensions.startInline.forEach(ie=>{L=ie.call({lexer:this},V),typeof L=="number"&&L>=0&&(w=Math.min(w,L))}),w<1/0&&w>=0&&(y=e.substring(0,w+1))}if(p=this.tokenizer.inlineText(y)){e=e.substring(p.raw.length),p.raw.slice(-1)!=="_"&&(o=p.raw.slice(-1)),l=!0;let w=n.at(-1);(w==null?void 0:w.type)==="text"?(w.raw+=p.raw,w.text+=p.text):n.push(p);continue}if(e){this.infiniteLoopError(e.charCodeAt(0));break}}return n}infiniteLoopError(e){let n="Infinite loop on byte: "+e;if(this.options.silent)console.error(n);else throw new Error(n)}},Y=class{constructor(t){g(this,"options");g(this,"parser");this.options=t||M}space(t){return""}code({text:t,lang:e,escaped:n}){var i;let r=(i=(e||"").match(x.notSpaceStart))==null?void 0:i[0],s=t.replace(x.endingNewline,"")+`
`;return r?'<pre><code class="language-'+v(r)+'">'+(n?s:v(s,!0))+`</code></pre>
`:"<pre><code>"+(n?s:v(s,!0))+`</code></pre>
`}blockquote({tokens:t}){return`<blockquote>
${this.parser.parse(t)}</blockquote>
`}html({text:t}){return t}def(t){return""}heading({tokens:t,depth:e}){return`<h${e}>${this.parser.parseInline(t)}</h${e}>
`}hr(t){return`<hr>
`}list(t){let e=t.ordered,n=t.start,r="";for(let l=0;l<t.items.length;l++){let o=t.items[l];r+=this.listitem(o)}let s=e?"ol":"ul",i=e&&n!==1?' start="'+n+'"':"";return"<"+s+i+`>
`+r+"</"+s+`>
`}listitem(t){return`<li>${this.parser.parse(t.tokens)}</li>
`}checkbox({checked:t}){return"<input "+(t?'checked="" ':"")+'disabled="" type="checkbox"> '}paragraph({tokens:t}){return`<p>${this.parser.parseInline(t)}</p>
`}table(t){let e="",n="";for(let s=0;s<t.header.length;s++)n+=this.tablecell(t.header[s]);e+=this.tablerow({text:n});let r="";for(let s=0;s<t.rows.length;s++){let i=t.rows[s];n="";for(let l=0;l<i.length;l++)n+=this.tablecell(i[l]);r+=this.tablerow({text:n})}return r&&(r=`<tbody>${r}</tbody>`),`<table>
<thead>
`+e+`</thead>
`+r+`</table>
`}tablerow({text:t}){return`<tr>
${t}</tr>
`}tablecell(t){let e=this.parser.parseInline(t.tokens),n=t.header?"th":"td";return(t.align?`<${n} align="${t.align}">`:`<${n}>`)+e+`</${n}>
`}strong({tokens:t}){return`<strong>${this.parser.parseInline(t)}</strong>`}em({tokens:t}){return`<em>${this.parser.parseInline(t)}</em>`}codespan({text:t}){return`<code>${v(t,!0)}</code>`}br(t){return"<br>"}del({tokens:t}){return`<del>${this.parser.parseInline(t)}</del>`}link({href:t,title:e,tokens:n}){let r=this.parser.parseInline(n),s=Ae(t);if(s===null)return r;t=s;let i='<a href="'+t+'"';return e&&(i+=' title="'+v(e)+'"'),i+=">"+r+"</a>",i}image({href:t,title:e,text:n,tokens:r}){r&&(n=this.parser.parseInline(r,this.parser.textRenderer));let s=Ae(t);if(s===null)return v(n);t=s;let i=`<img src="${t}" alt="${v(n)}"`;return e&&(i+=` title="${v(e)}"`),i+=">",i}text(t){return"tokens"in t&&t.tokens?this.parser.parseInline(t.tokens):"escaped"in t&&t.escaped?t.text:v(t.text)}},Se=class{strong({text:t}){return t}em({text:t}){return t}codespan({text:t}){return t}del({text:t}){return t}html({text:t}){return t}text({text:t}){return t}link({text:t}){return""+t}image({text:t}){return""+t}br(){return""}checkbox({raw:t}){return t}},S=class ue{constructor(e){g(this,"options");g(this,"renderer");g(this,"textRenderer");this.options=e||M,this.options.renderer=this.options.renderer||new Y,this.renderer=this.options.renderer,this.renderer.options=this.options,this.renderer.parser=this,this.textRenderer=new Se}static parse(e,n){return new ue(n).parse(e)}static parseInline(e,n){return new ue(n).parseInline(e)}parse(e){var r,s;this.renderer.parser=this;let n="";for(let i=0;i<e.length;i++){let l=e[i];if((s=(r=this.options.extensions)==null?void 0:r.renderers)!=null&&s[l.type]){let a=l,h=this.options.extensions.renderers[a.type].call({parser:this},a);if(h!==!1||!["space","hr","heading","code","table","blockquote","list","html","def","paragraph","text"].includes(a.type)){n+=h||"";continue}}let o=l;switch(o.type){case"space":{n+=this.renderer.space(o);break}case"hr":{n+=this.renderer.hr(o);break}case"heading":{n+=this.renderer.heading(o);break}case"code":{n+=this.renderer.code(o);break}case"table":{n+=this.renderer.table(o);break}case"blockquote":{n+=this.renderer.blockquote(o);break}case"list":{n+=this.renderer.list(o);break}case"checkbox":{n+=this.renderer.checkbox(o);break}case"html":{n+=this.renderer.html(o);break}case"def":{n+=this.renderer.def(o);break}case"paragraph":{n+=this.renderer.paragraph(o);break}case"text":{n+=this.renderer.text(o);break}default:{let a='Token with "'+o.type+'" type was not found.';if(this.options.silent)return console.error(a),"";throw new Error(a)}}}return n}parseInline(e,n=this.renderer){var s,i;this.renderer.parser=this;let r="";for(let l=0;l<e.length;l++){let o=e[l];if((i=(s=this.options.extensions)==null?void 0:s.renderers)!=null&&i[o.type]){let h=this.options.extensions.renderers[o.type].call({parser:this},o);if(h!==!1||!["escape","html","link","image","strong","em","codespan","br","del","text"].includes(o.type)){r+=h||"";continue}}let a=o;switch(a.type){case"escape":{r+=n.text(a);break}case"html":{r+=n.html(a);break}case"link":{r+=n.link(a);break}case"image":{r+=n.image(a);break}case"checkbox":{r+=n.checkbox(a);break}case"strong":{r+=n.strong(a);break}case"em":{r+=n.em(a);break}case"codespan":{r+=n.codespan(a);break}case"br":{r+=n.br(a);break}case"del":{r+=n.del(a);break}case"text":{r+=n.text(a);break}default:{let h='Token with "'+a.type+'" type was not found.';if(this.options.silent)return console.error(h),"";throw new Error(h)}}}return r}},H,N=(H=class{constructor(t){g(this,"options");g(this,"block");this.options=t||M}preprocess(t){return t}postprocess(t){return t}processAllTokens(t){return t}emStrongMask(t){return t}provideLexer(t=this.block){return t?_.lex:_.lexInline}provideParser(t=this.block){return t?S.parse:S.parseInline}},g(H,"passThroughHooks",new Set(["preprocess","postprocess","processAllTokens","emStrongMask"])),g(H,"passThroughHooksRespectAsync",new Set(["preprocess","postprocess","processAllTokens"])),H),rt=class{constructor(...t){g(this,"defaults",ge());g(this,"options",this.setOptions);g(this,"parse",this.parseMarkdown(!0));g(this,"parseInline",this.parseMarkdown(!1));g(this,"Parser",S);g(this,"Renderer",Y);g(this,"TextRenderer",Se);g(this,"Lexer",_);g(this,"Tokenizer",K);g(this,"Hooks",N);this.use(...t)}walkTokens(t,e){var r,s;let n=[];for(let i of t)switch(n=n.concat(e.call(this,i)),i.type){case"table":{let l=i;for(let o of l.header)n=n.concat(this.walkTokens(o.tokens,e));for(let o of l.rows)for(let a of o)n=n.concat(this.walkTokens(a.tokens,e));break}case"list":{let l=i;n=n.concat(this.walkTokens(l.items,e));break}default:{let l=i;(s=(r=this.defaults.extensions)==null?void 0:r.childTokens)!=null&&s[l.type]?this.defaults.extensions.childTokens[l.type].forEach(o=>{let a=l[o].flat(1/0);n=n.concat(this.walkTokens(a,e))}):l.tokens&&(n=n.concat(this.walkTokens(l.tokens,e)))}}return n}use(...t){let e=this.defaults.extensions||{renderers:{},childTokens:{}};return t.forEach(n=>{let r={...n};if(r.async=this.defaults.async||r.async||!1,n.extensions&&(n.extensions.forEach(s=>{if(!s.name)throw new Error("extension name required");if("renderer"in s){let i=e.renderers[s.name];i?e.renderers[s.name]=function(...l){let o=s.renderer.apply(this,l);return o===!1&&(o=i.apply(this,l)),o}:e.renderers[s.name]=s.renderer}if("tokenizer"in s){if(!s.level||s.level!=="block"&&s.level!=="inline")throw new Error("extension level must be 'block' or 'inline'");let i=e[s.level];i?i.unshift(s.tokenizer):e[s.level]=[s.tokenizer],s.start&&(s.level==="block"?e.startBlock?e.startBlock.push(s.start):e.startBlock=[s.start]:s.level==="inline"&&(e.startInline?e.startInline.push(s.start):e.startInline=[s.start]))}"childTokens"in s&&s.childTokens&&(e.childTokens[s.name]=s.childTokens)}),r.extensions=e),n.renderer){let s=this.defaults.renderer||new Y(this.defaults);for(let i in n.renderer){if(!(i in s))throw new Error(`renderer '${i}' does not exist`);if(["options","parser"].includes(i))continue;let l=i,o=n.renderer[l],a=s[l];s[l]=(...h)=>{let c=o.apply(s,h);return c===!1&&(c=a.apply(s,h)),c||""}}r.renderer=s}if(n.tokenizer){let s=this.defaults.tokenizer||new K(this.defaults);for(let i in n.tokenizer){if(!(i in s))throw new Error(`tokenizer '${i}' does not exist`);if(["options","rules","lexer"].includes(i))continue;let l=i,o=n.tokenizer[l],a=s[l];s[l]=(...h)=>{let c=o.apply(s,h);return c===!1&&(c=a.apply(s,h)),c}}r.tokenizer=s}if(n.hooks){let s=this.defaults.hooks||new N;for(let i in n.hooks){if(!(i in s))throw new Error(`hook '${i}' does not exist`);if(["options","block"].includes(i))continue;let l=i,o=n.hooks[l],a=s[l];N.passThroughHooks.has(i)?s[l]=h=>{if(this.defaults.async&&N.passThroughHooksRespectAsync.has(i))return(async()=>{let u=await o.call(s,h);return a.call(s,u)})();let c=o.call(s,h);return a.call(s,c)}:s[l]=(...h)=>{if(this.defaults.async)return(async()=>{let u=await o.apply(s,h);return u===!1&&(u=await a.apply(s,h)),u})();let c=o.apply(s,h);return c===!1&&(c=a.apply(s,h)),c}}r.hooks=s}if(n.walkTokens){let s=this.defaults.walkTokens,i=n.walkTokens;r.walkTokens=function(l){let o=[];return o.push(i.call(this,l)),s&&(o=o.concat(s.call(this,l))),o}}this.defaults={...this.defaults,...r}}),this}setOptions(t){return this.defaults={...this.defaults,...t},this}lexer(t,e){return _.lex(t,e??this.defaults)}parser(t,e){return S.parse(t,e??this.defaults)}parseMarkdown(t){return(e,n)=>{let r={...n},s={...this.defaults,...r},i=this.onError(!!s.silent,!!s.async);if(this.defaults.async===!0&&r.async===!1)return i(new Error("marked(): The async option was set to true by an extension. Remove async: false from the parse options object to return a Promise."));if(typeof e>"u"||e===null)return i(new Error("marked(): input parameter is undefined or null"));if(typeof e!="string")return i(new Error("marked(): input parameter is of type "+Object.prototype.toString.call(e)+", string expected"));if(s.hooks&&(s.hooks.options=s,s.hooks.block=t),s.async)return(async()=>{let l=s.hooks?await s.hooks.preprocess(e):e,o=await(s.hooks?await s.hooks.provideLexer(t):t?_.lex:_.lexInline)(l,s),a=s.hooks?await s.hooks.processAllTokens(o):o;s.walkTokens&&await Promise.all(this.walkTokens(a,s.walkTokens));let h=await(s.hooks?await s.hooks.provideParser(t):t?S.parse:S.parseInline)(a,s);return s.hooks?await s.hooks.postprocess(h):h})().catch(i);try{s.hooks&&(e=s.hooks.preprocess(e));let l=(s.hooks?s.hooks.provideLexer(t):t?_.lex:_.lexInline)(e,s);s.hooks&&(l=s.hooks.processAllTokens(l)),s.walkTokens&&this.walkTokens(l,s.walkTokens);let o=(s.hooks?s.hooks.provideParser(t):t?S.parse:S.parseInline)(l,s);return s.hooks&&(o=s.hooks.postprocess(o)),o}catch(l){return i(l)}}}onError(t,e){return n=>{if(n.message+=`
Please report this to https://github.com/markedjs/marked.`,t){let r="<p>An error occurred:</p><pre>"+v(n.message+"",!0)+"</pre>";return e?Promise.resolve(r):r}if(e)return Promise.reject(n);throw n}}},B=new rt;function k(t,e){return B.parse(t,e)}k.options=k.setOptions=function(t){return B.setOptions(t),k.defaults=B.defaults,Ge(k.defaults),k};k.getDefaults=ge;k.defaults=M;k.use=function(...t){return B.use(...t),k.defaults=B.defaults,Ge(k.defaults),k};k.walkTokens=function(t,e){return B.walkTokens(t,e)};k.parseInline=B.parseInline;k.Parser=S;k.parser=S.parse;k.Renderer=Y;k.TextRenderer=Se;k.Lexer=_;k.lexer=_.lex;k.Tokenizer=K;k.Hooks=N;k.parse=k;k.options;k.setOptions;k.use;k.walkTokens;k.parseInline;S.parse;_.lex;let st=!1;const cr=t=>{st=t},$=t=>t.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"),mn=/\.(png|jpe?g|gif|webp|bmp|ico|avif|tiff?|svg)$/i;function wn(t){let e="",n=!0;for(const r of t)/[\p{L}\p{N}]/u.test(r)?(e+=r.toLowerCase(),n=!1):n||(e+="-",n=!0);return e.replace(/-+$/,"")}function it(t,e,n){let r=t.trim(),s=null;if(n){const l=e.trim();l&&/^[0-9]+$/.test(l)&&(s=l)}if(r.startsWith("http:")||r.startsWith("https:")||r.startsWith("data:"))return`<img src="${$(r)}" alt="${$(e)}" loading="lazy">`;if(mn.test(r)){const l=s?` style="max-width:${s}px"`:"";return`<img data-embed="${$(r)}" alt="${$(e)}"${l}>`}const i=e===""||/^[0-9]+$/.test(e)?r.split("/").pop()??r:e;return`<a class="wikilink attachment" href="#" data-path="${$(r)}">${$(i)}</a>`}const xn={name:"wikiembed",level:"inline",start:t=>t.indexOf("!["),tokenizer(t){const e=/^!\[\[([^\][|]+?)(?:\|([^\][]*))?\]\]/.exec(t);if(e)return{type:"wikiembed",raw:e[0],target:e[1],label:e[2]??""}},renderer:t=>it(t.target,t.label,!0)},yn={name:"wikilink",level:"inline",start:t=>t.indexOf("[["),tokenizer(t){const e=/^\[\[([^\][|]+?)(?:\|([^\][]*))?\]\]/.exec(t);if(!e)return;const n=e[1].trim();return{type:"wikilink",raw:e[0],target:n,label:(e[2]??e[1]).trim()||n}},renderer:t=>{const{target:e,label:n}=t;return`<a class="wikilink" href="#" data-wikilink="${$(e)}">${$(n)}</a>`}},_n={name:"mdhighlight",level:"inline",start:t=>t.indexOf("=="),tokenizer(t){const e=/^==(\S(?:[^=\n]*\S)?)==/.exec(t);if(e)return{type:"mdhighlight",raw:e[0],tokens:this.lexer.inlineTokens(e[1])}},renderer(t){return`<mark>${this.parser.parseInline(t.tokens??[])}</mark>`}},at=new rt({gfm:!0});at.use({extensions:[xn,yn,_n],renderer:{image({href:t,text:e}){return it(t,e,!1)},link(t){const e=t.href,n=this.parser.parseInline(t.tokens);if(e.startsWith("#")||e.includes(":")||e.startsWith("//")){const s=t.title?` title="${$(t.title)}"`:"";return`<a href="${$(e)}"${s}>${n}</a>`}return`<a class="wikilink" href="#" data-path="${$(e)}">${n}</a>`},heading(t){const e=this.parser.parseInline(t.tokens);return`<h${t.depth} id="${wn(t.text)}">${e}</h${t.depth}>
`}}});const Sn=/^---\r?\n[\s\S]*?\r?\n(?:---|\.\.\.)(?:\r?\n|$)/;function $n(t){const e=t.replace(Sn,"");return at.parse(e,{breaks:st,async:!1})}const vn=`# text — Catppuccin Latte: the clean light flavor (catppuccin.com).
# See pt-dark.toml for the token reference.

name = "Catppuccin Latte"
dark = false

[colors]
bg = "#eff1f5"
bg-panel = "#e6e9ef"
bg-hover = "#dce0e8"
fg = "#4c4f69"
fg-muted = "#8c8fa1"
accent = "#8839ef"
heading = "#7287fd"
link = "#1e66f5"
tag = "#179299"
quote = "#6c6f85"
code = "#fe640b"
code-bg = "#e6e9ef"
border = "#dce0e8"
cursor = "#dc8a78"
selection = "#ccd0da"
highlight = "#f2dfa8"

[fonts]
editor = "ui-monospace, 'JetBrains Mono', 'Fira Code', 'DejaVu Sans Mono', monospace"
ui = "system-ui, sans-serif"
`,Rn=`# text — Catppuccin Mocha: soothing dark pastels (catppuccin.com).
# See pt-dark.toml for the token reference.

name = "Catppuccin Mocha"
dark = true

[colors]
bg = "#1e1e2e"
bg-panel = "#181825"
bg-hover = "#313244"
fg = "#cdd6f4"
fg-muted = "#7f849c"
accent = "#cba6f7"
heading = "#b4befe"
link = "#89b4fa"
tag = "#94e2d5"
quote = "#a6adc8"
code = "#fab387"
code-bg = "#27273a"
border = "#313244"
cursor = "#f5e0dc"
selection = "#45475a"
highlight = "#4a4335"

[fonts]
editor = "ui-monospace, 'JetBrains Mono', 'Fira Code', 'DejaVu Sans Mono', monospace"
ui = "system-ui, sans-serif"
`,Tn=`# text — Dracula: the high-contrast purple/pink dark classic (draculatheme.com).
# See pt-dark.toml for the token reference.

name = "Dracula"
dark = true

[colors]
bg = "#282a36"
bg-panel = "#21222c"
bg-hover = "#343746"
fg = "#f8f8f2"
fg-muted = "#6272a4"
accent = "#bd93f9"
heading = "#ff79c6"
link = "#8be9fd"
tag = "#50fa7b"
quote = "#bcc4e0"
code = "#f1fa8c"
code-bg = "#2f3140"
border = "#343746"
cursor = "#f8f8f2"
selection = "#44475a"
highlight = "#4e4a2a"

[fonts]
editor = "ui-monospace, 'JetBrains Mono', 'Fira Code', 'DejaVu Sans Mono', monospace"
ui = "system-ui, sans-serif"
`,Cn=`# text — Emotion Side B Dark: crisp charcoal page, the album's bright blue and
# hot pink on the chrome. Blue on tabs/buttons/links/caret; pink on the active
# file and selection (see the sibling .css). See pt-dark.toml for tokens.

name = "Emotion Side B Dark"
dark = true

[colors]
bg = "#0f1115"
bg-panel = "#15181e"
bg-hover = "#1d212a"
fg = "#eef0f4"
fg-muted = "#888e9a"
accent = "#3d9bff"
heading = "#f2f4f8"
link = "#3d9bff"
tag = "#ff5fa0"
quote = "#888e9a"
code = "#ff8fb8"
code-bg = "#1b1620"
border = "#242833"
cursor = "#3d9bff"
selection = "#3a2030"
highlight = "#4a3f1d"

[fonts]
editor = "ui-monospace, 'JetBrains Mono', 'Fira Code', 'DejaVu Sans Mono', monospace"
ui = "system-ui, sans-serif"
`,zn=`# text — Emotion Side B: crisp white page, the album's bright blue and hot
# pink saved for the chrome. Blue rides the tabs/buttons/links/caret; pink
# marks the active file and your selection (see the sibling .css for placement).
# See pt-dark.toml for the token reference.

name = "Emotion Side B"
dark = false

[colors]
bg = "#ffffff"
bg-panel = "#f7f8fc"
bg-hover = "#eef1f8"
fg = "#16181d"
fg-muted = "#8a8f9b"
accent = "#2b8fff"
heading = "#14161b"
link = "#2b8fff"
tag = "#ff4f9a"
quote = "#8a8f9b"
code = "#c2266e"
code-bg = "#fdeef5"
border = "#e6e8f0"
cursor = "#2b8fff"
selection = "#ffd6e6"
highlight = "#ffec8a"

[fonts]
editor = "ui-monospace, 'JetBrains Mono', 'Fira Code', 'DejaVu Sans Mono', monospace"
ui = "system-ui, sans-serif"
`,Ln=`# text — GitHub Light: stark white and gray, straight off the platform.
# See pt-dark.toml for the token reference.

name = "GitHub Light"
dark = false

[colors]
bg = "#ffffff"
bg-panel = "#f6f8fa"
bg-hover = "#eaeef2"
fg = "#1f2328"
fg-muted = "#656d76"
accent = "#0969da"
heading = "#1f2328"
link = "#0969da"
tag = "#8250df"
quote = "#656d76"
code = "#cf222e"
code-bg = "#f6f8fa"
border = "#d8dee4"
cursor = "#1f2328"
selection = "#b6d7ff"
highlight = "#fff8c5"

[fonts]
editor = "ui-monospace, 'JetBrains Mono', 'Fira Code', 'DejaVu Sans Mono', monospace"
ui = "system-ui, sans-serif"
`,An=`# text — Gruvbox Light: the warm, retro counterpart to Gruvbox.
# See pt-dark.toml for the token reference.

name = "Gruvbox Light"
dark = false

[colors]
bg = "#fbf1c7"
bg-panel = "#f4e8be"
bg-hover = "#ebdbb2"
fg = "#3c3836"
fg-muted = "#7c6f64"
accent = "#af3a03"
heading = "#9d0006"
link = "#076678"
tag = "#8f3f71"
quote = "#427b58"
code = "#b57614"
code-bg = "#f2e5bc"
border = "#d5c4a1"
cursor = "#3c3836"
selection = "#e6d5a3"
highlight = "#e8cd7d"

[fonts]
editor = "ui-monospace, 'JetBrains Mono', 'Fira Code', 'DejaVu Sans Mono', monospace"
ui = "system-ui, sans-serif"
`,Bn=`# text — Gruvbox: warm retro-groove dark (github.com/morhetz/gruvbox).
# See pt-dark.toml for the token reference.

name = "Gruvbox"
dark = true

[colors]
bg = "#282828"
bg-panel = "#1d2021"
bg-hover = "#3c3836"
fg = "#ebdbb2"
fg-muted = "#928374"
accent = "#fe8019"
heading = "#fabd2f"
link = "#83a598"
tag = "#d3869b"
quote = "#b8bb26"
code = "#8ec07c"
code-bg = "#32302f"
border = "#3c3836"
cursor = "#ebdbb2"
selection = "#504945"
highlight = "#4f3f16"

[fonts]
editor = "ui-monospace, 'JetBrains Mono', 'Fira Code', 'DejaVu Sans Mono', monospace"
ui = "system-ui, sans-serif"
`,Mn=`# text — iA Writer Dark: the signature minimalist look, inverted. Near-black
# paper, warm grey ink, one calm blue accent. See pt-dark.toml for tokens.

name = "iA Writer Dark"
dark = true

[colors]
bg = "#1a1a1a"
bg-panel = "#202020"
bg-hover = "#2a2a2a"
fg = "#cfcfcf"
fg-muted = "#6f6f6f"
accent = "#5c9cdb"
heading = "#f2f2f2"
link = "#5c9cdb"
tag = "#8a8a8a"
quote = "#8f8f8f"
code = "#bdbdbd"
code-bg = "#222222"
border = "#2c2c2c"
cursor = "#5c9cdb"
selection = "#27384a"
highlight = "#57491a"

[fonts]
editor = "ui-monospace, 'JetBrains Mono', 'Fira Code', 'DejaVu Sans Mono', monospace"
ui = "system-ui, sans-serif"
`,En=`# text — iA Writer: clean minimalist white with the signature blue accent.
# See pt-dark.toml for the token reference.

name = "iA Writer"
dark = false

[colors]
bg = "#fcfcfc"
bg-panel = "#f3f3f3"
bg-hover = "#e9e9e9"
fg = "#1a1a1a"
fg-muted = "#9b9b9b"
accent = "#1d9bf0"
heading = "#000000"
link = "#1d9bf0"
tag = "#7a7a7a"
quote = "#6f6f6f"
code = "#4a4a4a"
code-bg = "#f3f3f3"
border = "#e4e4e4"
cursor = "#1d9bf0"
selection = "#cce7fb"
highlight = "#ffec8a"

[fonts]
editor = "ui-monospace, 'JetBrains Mono', 'Fira Code', 'DejaVu Sans Mono', monospace"
ui = "system-ui, sans-serif"
`,Pn=`# text — Monokai Calm: monokai's voice, desaturated to easy-evening levels.
# See pt-dark.toml for the token reference.

name = "Monokai Calm"
dark = true

[colors]
bg = "#2a2a26"
bg-panel = "#232320"
bg-hover = "#32322d"
fg = "#d8d8d2"
fg-muted = "#8f8f85"
accent = "#a6c969"
heading = "#dfd06e"
link = "#87c5c0"
tag = "#c489b2"
quote = "#9c9c90"
code = "#d3a96c"
code-bg = "#32322d"
border = "#3a3a34"
cursor = "#d8d8d2"
selection = "#45453d"
highlight = "#55511f"

[fonts]
editor = "ui-monospace, 'JetBrains Mono', 'Fira Code', 'DejaVu Sans Mono', monospace"
ui = "system-ui, sans-serif"
`,Dn=`# text — Nord Light: the Snow Storm palette, frost accents on cool white.
# See pt-dark.toml for the token reference.

name = "Nord Light"
dark = false

[colors]
bg = "#eceff4"
bg-panel = "#e5e9f0"
bg-hover = "#dde3ec"
fg = "#2e3440"
fg-muted = "#60718c"
accent = "#5e81ac"
heading = "#2e3440"
link = "#5e81ac"
tag = "#b48ead"
quote = "#4c566a"
code = "#bf616a"
code-bg = "#e5e9f0"
border = "#d8dee9"
cursor = "#2e3440"
selection = "#d2dae6"
highlight = "#f3e1b0"

[fonts]
editor = "ui-monospace, 'JetBrains Mono', 'Fira Code', 'DejaVu Sans Mono', monospace"
ui = "system-ui, sans-serif"
`,In=`# text — Nord: the arctic, muted blue palette (nordtheme.com).
# See pt-dark.toml for the token reference.

name = "Nord"
dark = true

[colors]
bg = "#2e3440"
bg-panel = "#3b4252"
bg-hover = "#434c5e"
fg = "#d8dee9"
fg-muted = "#7b88a1"
accent = "#88c0d0"
heading = "#eceff4"
link = "#81a1c1"
tag = "#b48ead"
quote = "#a3be8c"
code = "#ebcb8b"
code-bg = "#3b4252"
border = "#3b4252"
cursor = "#d8dee9"
selection = "#434c5e"
highlight = "#4d4530"

[fonts]
editor = "ui-monospace, 'JetBrains Mono', 'Fira Code', 'DejaVu Sans Mono', monospace"
ui = "system-ui, sans-serif"
`,qn=`# pt — theme file
#
# Drop a copy of this file in this folder, change the colors, and it appears
# in the theme picker (Ctrl+Shift+T). An optional sibling <name>.css file is
# injected verbatim for anything tokens can't reach.
#
# tokens:
#   bg         editor background          fg         body text
#   bg-panel   sidebar / panel background fg-muted   secondary text, syntax marks
#   bg-hover   hover / active row         accent     interactive highlights, cursor line
#   heading    markdown headings          link       links and wikilinks
#   tag        #tags                      quote      blockquotes
#   code       inline code / monospans    code-bg    code block background
#   border     hairlines                  cursor     caret
#   selection  text selection             highlight  ==highlighted== text wash

name = "PT Dark"
dark = true

[colors]
bg = "#151618"
bg-panel = "#1b1d20"
bg-hover = "#222428"
fg = "#d4d4d0"
fg-muted = "#84878c"
accent = "#8fb4d8"
heading = "#e8e6e0"
link = "#8fb4d8"
tag = "#a8a3c7"
quote = "#9aa3a8"
code = "#c9b99a"
code-bg = "#1f2125"
border = "#26282c"
cursor = "#d4d4d0"
selection = "#2c3a48"
highlight = "#4d4020"

[fonts]
editor = "ui-monospace, 'JetBrains Mono', 'Fira Code', 'DejaVu Sans Mono', monospace"
ui = "system-ui, sans-serif"
`,jn=`# pt — PT Light: paper-white counterpart to PT Dark.
# See pt-dark.toml for the token reference.

name = "PT Light"
dark = false

[colors]
bg = "#faf9f6"
bg-panel = "#f1efe9"
bg-hover = "#e9e6dd"
fg = "#2c2c2a"
fg-muted = "#8b8880"
accent = "#4a6e8a"
heading = "#1c1c1a"
link = "#41637c"
tag = "#6d5f8f"
quote = "#6b6f72"
code = "#6d5f3f"
code-bg = "#efede5"
border = "#e2dfd6"
cursor = "#2c2c2a"
selection = "#d9e2ea"
highlight = "#ffef9e"

[fonts]
editor = "ui-monospace, 'JetBrains Mono', 'Fira Code', 'DejaVu Sans Mono', monospace"
ui = "system-ui, sans-serif"
`,Fn=`# text — Solarized Dark: Ethan Schoonover's precision palette (ethanschoonover.com/solarized).
# See pt-dark.toml for the token reference.

name = "Solarized Dark"
dark = true

[colors]
bg = "#002b36"
bg-panel = "#073642"
bg-hover = "#0a4250"
fg = "#93a1a1"
fg-muted = "#586e75"
accent = "#b58900"
heading = "#fdf6e3"
link = "#268bd2"
tag = "#6c71c4"
quote = "#859900"
code = "#2aa198"
code-bg = "#073642"
border = "#073642"
cursor = "#93a1a1"
selection = "#0e4a59"
highlight = "#4a4515"

[fonts]
editor = "ui-monospace, 'JetBrains Mono', 'Fira Code', 'DejaVu Sans Mono', monospace"
ui = "system-ui, sans-serif"
`,Nn=`# text — Solarized Light: Ethan Schoonover's classic low-contrast prose palette.
# See pt-dark.toml for the token reference.

name = "Solarized Light"
dark = false

[colors]
bg = "#fdf6e3"
bg-panel = "#eee8d5"
bg-hover = "#e8e1cd"
fg = "#657b83"
fg-muted = "#93a1a1"
accent = "#268bd2"
heading = "#586e75"
link = "#268bd2"
tag = "#6c71c4"
quote = "#859900"
code = "#cb4b16"
code-bg = "#f3ecd9"
border = "#e8e0c9"
cursor = "#657b83"
selection = "#e3dcc4"
highlight = "#efdb87"

[fonts]
editor = "ui-monospace, 'JetBrains Mono', 'Fira Code', 'DejaVu Sans Mono', monospace"
ui = "system-ui, sans-serif"
`,On=`# text — Tokyo Day: the bright daytime variant of Tokyo Night.
# See pt-dark.toml for the token reference.

name = "Tokyo Day"
dark = false

[colors]
bg = "#e1e2e7"
bg-panel = "#d6d8df"
bg-hover = "#cbcfdb"
fg = "#3760bf"
fg-muted = "#7086b5"
accent = "#2e7de9"
heading = "#006a83"
link = "#2e7de9"
tag = "#9854f1"
quote = "#587539"
code = "#b15c00"
code-bg = "#d6d8df"
border = "#c4c8da"
cursor = "#3760bf"
selection = "#b6bfe2"
highlight = "#f0dfa6"

[fonts]
editor = "ui-monospace, 'JetBrains Mono', 'Fira Code', 'DejaVu Sans Mono', monospace"
ui = "system-ui, sans-serif"
`,Zn=`# text — Tokyo Night: neon dusk-to-night blues and purples.
# See pt-dark.toml for the token reference.

name = "Tokyo Night"
dark = true

[colors]
bg = "#1a1b26"
bg-panel = "#16161e"
bg-hover = "#292e42"
fg = "#a9b1d6"
fg-muted = "#565f89"
accent = "#7aa2f7"
heading = "#c0caf5"
link = "#7dcfff"
tag = "#bb9af7"
quote = "#9ece6a"
code = "#e0af68"
code-bg = "#1f2335"
border = "#292e42"
cursor = "#c0caf5"
selection = "#33467c"
highlight = "#46402a"

[fonts]
editor = "ui-monospace, 'JetBrains Mono', 'Fira Code', 'DejaVu Sans Mono', monospace"
ui = "system-ui, sans-serif"
`,Wn=`/* Emotion Side B Dark — hot pink on the active file row against blue chrome. */
.tree-row.current {
  background: color-mix(in srgb, #ff5fa0 18%, transparent);
  color: #ff7fb4;
  box-shadow: inset 3px 0 0 #ff5fa0;
}
.tree-row.current .tree-icon {
  opacity: 0.9;
}
`,Jn=`/* Emotion Side B — put the hot pink on the active file row so it reads
   against the blue tabs/buttons. Tokens carry the blue; this carries the pink. */
.tree-row.current {
  background: color-mix(in srgb, #ff4f9a 14%, transparent);
  color: #e23e86;
  box-shadow: inset 3px 0 0 #ff4f9a;
}
.tree-row.current .tree-icon {
  opacity: 0.9;
}
`,Vn=Object.assign({"../../src-tauri/themes/catppuccin-latte.toml":vn,"../../src-tauri/themes/catppuccin-mocha.toml":Rn,"../../src-tauri/themes/dracula.toml":Tn,"../../src-tauri/themes/emotion-side-b-dark.toml":Cn,"../../src-tauri/themes/emotion-side-b.toml":zn,"../../src-tauri/themes/github-light.toml":Ln,"../../src-tauri/themes/gruvbox-light.toml":An,"../../src-tauri/themes/gruvbox.toml":Bn,"../../src-tauri/themes/ia-writer-dark.toml":Mn,"../../src-tauri/themes/ia-writer.toml":En,"../../src-tauri/themes/monokai-calm.toml":Pn,"../../src-tauri/themes/nord-light.toml":Dn,"../../src-tauri/themes/nord.toml":In,"../../src-tauri/themes/pt-dark.toml":qn,"../../src-tauri/themes/pt-light.toml":jn,"../../src-tauri/themes/solarized-dark.toml":Fn,"../../src-tauri/themes/solarized-light.toml":Nn,"../../src-tauri/themes/tokyo-day.toml":On,"../../src-tauri/themes/tokyo-night.toml":Zn}),Gn=Object.assign({"../../src-tauri/themes/emotion-side-b-dark.css":Wn,"../../src-tauri/themes/emotion-side-b.css":Jn}),Pe=t=>(t.split("/").pop()??t).replace(/\.[^.]*$/,"");function Hn(t){let e="",n=!1;const r={colors:{},fonts:{}};let s=null;for(const i of t.split(`
`)){const l=i.trim();if(!l||l.startsWith("#"))continue;const o=/^\[([A-Za-z0-9_-]+)\]$/.exec(l);if(o){s=r[o[1]]??(r[o[1]]={});continue}const a=/^([A-Za-z0-9_-]+)\s*=\s*(.+)$/.exec(l);if(!a)continue;const h=a[1];let c=a[2].trim(),u;const f=/^"((?:[^"\\]|\\.)*)"|^'([^']*)'/.exec(c);f?u=f[1]!==void 0?f[1].replace(/\\(.)/g,"$1"):f[2]:u=c.split("#")[0].trim(),s?s[h]=u:h==="name"?e=u:h==="dark"&&(n=u==="true")}return{name:e,dark:n,colors:r.colors,fonts:r.fonts}}let oe=null;function Qn(){if(oe)return oe;const t=new Map(Object.entries(Gn).map(([n,r])=>[Pe(n),r])),e=[];for(const[n,r]of Object.entries(Vn)){const s=Pe(n);try{const i=Hn(r);e.push({id:s,name:i.name||s,dark:i.dark,colors:i.colors,fonts:i.fonts,css:t.get(s)??null})}catch(i){console.error(`theme ${s}:`,i)}}return e.sort((n,r)=>n.name.localeCompare(r.name)),oe=e,e}const Xn=4*1024*1024,Un=2*1024*1024,De=500,Kn=new Set(["md","markdown","mdown","txt","text","json","yaml","yml","toml","ini","cfg","conf","csv","tsv","log","tex","bib","org","rst","adoc","html","htm","css","js","ts","jsx","tsx","py","rs","sh","bash","zsh","fish","c","h","cpp","hpp","go","rb","lua","sql","xml","svg","env","gitignore","fountain"]),Yn=new Set(["png","jpg","jpeg","gif","webp","bmp","ico","avif","tiff","tif","mp3","wav","ogg","oga","m4a","flac","opus","aac","weba","mp4","m4v","webm","mov","mkv","ogv","pdf"]),ot=t=>{const e=t.lastIndexOf(".");return e>0?t.slice(e+1).toLowerCase():null},$e=t=>{const e=ot(t);return e===null||Kn.has(e)},er=t=>$e(t)||Yn.has(ot(t)??""),b=t=>{const e=t.trim().replace(/\/+$/,"");return e===""||e==="/"?"":e.startsWith("/")?e:`/${e}`},Ie=(t,e)=>`${b(t)}/${e}`,qe=t=>t.slice(t.lastIndexOf("/")+1),ee=t=>t.slice(0,t.lastIndexOf("/")),te=(t,e)=>e.slice(b(t).length).replace(/^\//,""),pe=t=>t.split("/").some(e=>e.startsWith(".")),se=new Map,C=new Map;function R(t,e){const n=T(t);if(se.set(t.path_lower,{rev:t.rev,mtime:n}),e!==void 0&&$e(t.name)){const r={rev:t.rev,text:e,mtime:n,path:t.path_display,size:t.size};C.set(t.path_lower,r),mt({pathLower:t.path_lower,...r})}}function je(t){const e=`${t}/`;for(const n of[se,C])for(const r of n.keys())(r===t||r.startsWith(e))&&n.delete(r);Je(t)}const fe=t=>t!==null&&t[".tag"]!=="folder",Fe=(t,e)=>e[".tag"]==="file"&&$e(e.name)&&e.size<=Xn&&!pe(te(t,e.path_display));let tr=null;const nr=()=>tr??(tr=bt().then(t=>{for(const e of t)C.has(e.pathLower)||C.set(e.pathLower,{rev:e.rev,text:e.text,mtime:e.mtime,path:e.path,size:e.size})}));async function Ne(t){const e=t.filter(s=>{var i;return((i=C.get(s.path_lower))==null?void 0:i.rev)!==s.rev});let n=0;const r=async()=>{for(;n<e.length;){const s=e[n++],{resp:i,meta:l}=await O(s.path_lower);R(l,await i.text())}};await Promise.all(Array.from({length:Math.min(6,e.length)},r))}async function le(t){const e=b(t);await nr();const n=await xt(e.toLowerCase());let r=!1;if(n)try{const l=await dt(n);for(const o of l.entries)o[".tag"]==="deleted"&&(C.delete(o.path_lower),se.delete(o.path_lower),Je(o.path_lower));await Ne(l.entries.filter(o=>Fe(e,o))),await Te(e.toLowerCase(),l.cursor),r=!0}catch{await yt(e.toLowerCase())}if(!r){const{entries:l,cursor:o}=await gt(e,!0),a=l.filter(u=>Fe(e,u)),h=new Set(a.map(u=>u.path_lower)),c=`${e.toLowerCase()}/`;for(const u of C.keys())u.startsWith(c)&&!h.has(u)&&(C.delete(u),wt(u));await Ne(a),await Te(e.toLowerCase(),o)}const s=`${e.toLowerCase()}/`,i=[];for(const[l,o]of C)l.startsWith(s)&&i.push(o);return i}async function rr(t,e,n){const r=b(t);let s;const i=se.get(r.toLowerCase());if(n===null)s="overwrite";else if(i&&i.mtime===n)s={".tag":"update",update:i.rev};else{const l=await ve(r);if(!fe(l))s="add";else{if(T(l)!==n)return{mtime:T(l),conflict:!0};s={".tag":"update",update:l.rev}}}try{const l=await F(r,e,s);return R(l,e),{mtime:T(l),conflict:!1}}catch(l){if(l instanceof Q&&X(l.error,"conflict")){const o=await ve(r);return{mtime:fe(o)?T(o):0,conflict:!0}}throw l}}const lt=new Map,Oe=new Map;async function sr(t){const e=b(t),n={};for(const r of lt.get(e.toLowerCase())??[]){let s=Oe.get(r.path_lower);if(!s||s.rev!==r.rev){s={rev:r.rev,order:[]};try{const l=JSON.parse(await(await O(r.path_lower)).resp.text()).order;Array.isArray(l)&&(s.order=l.filter(o=>typeof o=="string"))}catch{}Oe.set(r.path_lower,s)}if(s.order.length){const i=ee(r.path_lower);n[i===e.toLowerCase()?e:ee(r.path_display)]=s.order}}return n}async function ir(t){const e=b(t),n=await ft(e,!0);lt.set(e.toLowerCase(),n.filter(o=>o[".tag"]==="file"&&o.name===".corkboard"&&!pe(te(e,ee(o.path_display)))));const r=new Map,s={name:"",path:e,is_dir:!0,mtime:0,children:[]};r.set(e.toLowerCase(),s);const i=n.filter(o=>o.path_lower!==e.toLowerCase()&&!pe(te(e,o.path_display)));for(const o of i)o[".tag"]==="folder"&&r.set(o.path_lower,{name:o.name,path:o.path_display,is_dir:!0,mtime:0,children:[]});for(const o of i){const a=r.get(ee(o.path_lower)||e.toLowerCase());a&&(o[".tag"]==="folder"?a.children.push(r.get(o.path_lower)):er(o.name)&&(R(o),a.children.push({name:o.name,path:o.path_display,is_dir:!1,mtime:T(o),children:null})))}const l=o=>{const a=c=>c.name.toLowerCase(),h=[...o.filter(c=>c.is_dir).sort((c,u)=>a(c).localeCompare(a(u))),...o.filter(c=>!c.is_dir).sort((c,u)=>a(c).localeCompare(a(u)))];for(const c of h)c.children&&(c.children=l(c.children));return h};return l(s.children)}const Ze=t=>{const e=new Uint8Array(t);let n="";const r=32768;for(let s=0;s<e.length;s+=r)n+=String.fromCharCode(...e.subarray(s,s+r));return btoa(n)},We=t=>{const e=atob(t),n=new Uint8Array(e.length);for(let r=0;r<e.length;r++)n[r]=e.charCodeAt(r);return n},ar=(t,e,n)=>n?t.toLowerCase().indexOf(e):t.indexOf(e),hr={listTree:ir,folderOrders:sr,writeFile:rr,readFile:async t=>{const{resp:e,meta:n}=await O(b(t)),r=await e.text();return R(n,r),{content:r,mtime:T(n)}},readImage:async t=>{const{resp:e,meta:n}=await O(b(t));return R(n),{base64:Ze(await e.arrayBuffer()),mtime:T(n)}},statMtime:async t=>{const e=await pt(b(t));if(!fe(e))throw new Error(`${t} is a folder`);return T(e)},createFile:async t=>{try{R(await F(b(t),"","add"),"")}catch(e){throw e instanceof Q&&X(e.error,"conflict")?new Error(`${t} already exists`):e}},createDir:async t=>{try{await E("files/create_folder_v2",{path:b(t),autorename:!1})}catch(e){if(e instanceof Q&&X(e.error,"conflict"))return;throw e}},renamePath:async(t,e)=>{await E("files/move_v2",{from_path:b(t),to_path:b(e),autorename:!1}),je(b(t).toLowerCase())},copyPath:async(t,e)=>(await E("files/copy_v2",{from_path:b(t),to_path:Ie(e,qe(b(t))),autorename:!0})).metadata.path_display,overwriteBase64:async(t,e)=>{R(await F(b(t),We(e),"overwrite"))},importFile:()=>{throw new Error("importFile is desktop-only")},writeBase64:async(t,e,n)=>{const r=await F(Ie(t,e),We(n),"add",!0);return R(r),r.path_display},trashPath:async t=>{await E("files/delete_v2",{path:b(t)}),je(b(t).toLowerCase())},readBase64:async t=>{const{resp:e,meta:n}=await O(b(t));return R(n),Ze(await e.arrayBuffer())},writeTextFile:async(t,e)=>{R(await F(b(t),e,"overwrite"),e)},copyFile:async(t,e)=>{try{await E("files/delete_v2",{path:b(e)})}catch(n){if(!(n instanceof Q&&X(n.error,"not_found")))throw n}await E("files/copy_v2",{from_path:b(t),to_path:b(e),autorename:!1})},searchText:async(t,e)=>{if(!e.trim())return[];const n=!new RegExp("\\p{Lu}","u").test(e),r=n?e.toLowerCase():e,s=[];for(const i of await le(t)){const l=i.text.split(`
`);for(let o=0;o<l.length;o++){const a=ar(l[o],r,n);if(!(a<0)&&(s.push({path:i.path,line:o+1,text:l[o].slice(0,400),start:a,end:Math.min(a+e.length,400)}),s.length>=De))return s}}return s},findBacklinks:async(t,e)=>{if(!e.trim())return[];const n=e.trim().replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),r=new RegExp(`\\[\\[${n}\\s*([|#][^\\]]*)?\\]\\]`,"i"),s=[];for(const i of await le(t)){const l=i.text.split(`
`);for(let o=0;o<l.length;o++){const a=r.exec(l[o]);if(a&&(s.push({path:i.path,line:o+1,text:l[o].slice(0,400),start:a.index,end:Math.min(a.index+a[0].length,400)}),s.length>=De))return s}}return s},collectNotes:async t=>{const e=[];for(const n of await le(t)){const r=qe(n.path);if(!Lt(r)||n.size>Un)continue;const{fields:s,tags:i,tasks:l}=zt(n.text);e.push({path:n.path,rel:te(t,n.path),name:r.replace(/\.[^.]*$/,""),mtime:n.mtime,tags:i,fields:s,tasks:l})}return e},openWindow:async(t,e)=>{const n=new URL(location.origin+location.pathname);t&&n.searchParams.set("root",t),e&&n.searchParams.set("file",e),window.open(n.toString(),"_blank")},windowInitParams:async()=>{const t=new URLSearchParams(location.search),e=t.get("root"),n=t.get("file");return e||n?{root:e,file:n}:null},renderPreview:async t=>$n(t),listThemes:async()=>Qn(),themesDirPath:async()=>"",loadConfig:async()=>vt(),saveConfig:async t=>Rt(t),watchRoot:async()=>{}};export{fr as auth,hr as dropboxBackend,cr as setSingleLineBreaks};
