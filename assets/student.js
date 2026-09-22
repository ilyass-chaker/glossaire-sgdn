(() => {
  const app = window.GlossaryApp;
  let chapters = [], entries = [], selectedLetter = '', filteredEntries = [];
  let flashDeck = [], flashIndex = 0, revealed = false, shuffled = false;

  const $ = id => document.getElementById(id);
  function chapterMap(){ return new Map(chapters.map(c => [c.id, c])); }
  function withChapter(e){ const c = chapterMap().get(e.chapter_id); return {...e, chapter_title:c?.title || '', chapter_position:c?.position ?? 9999}; }

  async function loadData(){
    if(!app.configured){ $('configError').classList.remove('hidden'); renderAll(); return; }
    const [{data:cs,error:ce},{data:es,error:ee}] = await Promise.all([
      app.db.from('chapters').select('id,title,position').order('position').order('title'),
      app.db.from('glossary_entries').select('id,chapter_id,term,definition,example,position').order('term')
    ]);
    if(ce || ee){ $('configError').textContent='Impossible de charger le glossaire : '+(ce?.message || ee?.message); $('configError').classList.remove('hidden'); return; }
    chapters = cs || []; entries = es || []; refreshSelectors(); renderAll(); refreshFlashcards(true);
  }

  function refreshSelectors(){
    const opts = chapters.map(c=>`<option value="${c.id}">${app.escapeHtml(c.title)}</option>`).join('');
    const current=$('chapterFilter').value, flash=$('flashChapter').value;
    $('chapterFilter').innerHTML='<option value="">Tous les chapitres</option>'+opts;
    $('flashChapter').innerHTML='<option value="">Tous les chapitres</option>'+opts;
    if(chapters.some(c=>String(c.id)===current)) $('chapterFilter').value=current;
    if(chapters.some(c=>String(c.id)===flash)) $('flashChapter').value=flash;
  }

  function buildAlphabet(){
    $('alphabet').innerHTML='<button class="letter all active" data-letter="">Toutes</button>'+[...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].map(l=>`<button class="letter" data-letter="${l}">${l}</button>`).join('');
    $('alphabet').addEventListener('click',e=>{const b=e.target.closest('.letter');if(!b)return;selectedLetter=b.dataset.letter;document.querySelectorAll('.letter').forEach(x=>x.classList.toggle('active',x===b));renderAll();});
  }

  function computeFiltered(){
    const q=app.normalize($('searchInput').value), chapterId=$('chapterFilter').value;
    filteredEntries=entries.map(withChapter).filter(e=>{
      const letterOk=!selectedLetter||app.normalize(e.term).startsWith(app.normalize(selectedLetter));
      const chapterOk=!chapterId||String(e.chapter_id)===chapterId;
      const text=app.normalize(`${e.term} ${e.definition} ${e.example||''}`);
      return letterOk&&chapterOk&&(!q||text.includes(q));
    }).sort((a,b)=>a.term.localeCompare(b.term,'fr',{sensitivity:'base'}));
  }

  function renderAll(){
    computeFiltered();
    const title=$('chapterFilter').value ? chapters.find(c=>String(c.id)===$('chapterFilter').value)?.title || 'Toutes les notions' : 'Toutes les notions';
    $('viewTitle').textContent=title+(selectedLetter?` · Lettre ${selectedLetter}`:'');
    $('resultCount').textContent=`${filteredEntries.length} notion${filteredEntries.length>1?'s':''} affichée${filteredEntries.length>1?'s':''}`;
    $('cards').innerHTML=filteredEntries.length?filteredEntries.map(e=>`<article class="card"><h3 class="term">${app.escapeHtml(e.term)}</h3><div class="chapter-badge">${app.escapeHtml(e.chapter_title)}</div><p class="definition">${app.escapeHtml(e.definition)}</p>${e.example?`<div class="example"><strong>Exemple :</strong> ${app.escapeHtml(e.example)}</div>`:''}</article>`).join(''):'<div class="empty">Aucune notion ne correspond aux filtres sélectionnés.</div>';
  }

  function resetFilters(){selectedLetter='';$('searchInput').value='';$('chapterFilter').value='';document.querySelectorAll('.letter').forEach(b=>b.classList.toggle('active',b.dataset.letter===''));renderAll();}

  function showView(view){
    const flash=view==='flash'; $('glossaryView').classList.toggle('hidden',flash); $('flashcardsView').classList.toggle('hidden',!flash);
    $('navGlossary').classList.toggle('active',!flash); $('navFlashcards').classList.toggle('active',flash);
    $('pageTitle').textContent=flash?'Flashcards':'Glossaire interactif';
    $('pageDescription').textContent=flash?'Testez vos connaissances et mémorisez les notions essentielles.':'Selon vos besoins, consultez rapidement les notions du programme grâce aux filtres alphabétiques et par chapitre.';
    if(flash) refreshFlashcards(false);
  }

  function sourceFlashcards(){const id=$('flashChapter').value;return entries.map(withChapter).filter(e=>!id||String(e.chapter_id)===id).sort((a,b)=>a.term.localeCompare(b.term,'fr',{sensitivity:'base'}));}
  function randomize(items){const d=items.slice();for(let i=d.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[d[i],d[j]]=[d[j],d[i]];}return d;}
  function refreshFlashcards(reset=true){const src=sourceFlashcards();flashDeck=shuffled?randomize(src):src;if(reset)flashIndex=0;if(flashIndex>=flashDeck.length)flashIndex=0;revealed=false;renderFlash();}
  function renderFlash(){
    $('shuffleBtn').classList.toggle('active',shuffled);$('shuffleBtn').setAttribute('aria-pressed',shuffled?'true':'false');$('shuffleBtn').textContent=shuffled?'Ordre aléatoire activé':'Mélanger les cartes';
    const selected=$('flashChapter').value;$('flashScope').textContent=selected?chapters.find(c=>String(c.id)===selected)?.title||'Chapitre':'Tous les chapitres';
    if(!flashDeck.length){$('flashEmpty').classList.remove('hidden');$('flashDeck').classList.add('hidden');$('flashCounter').textContent='0 carte';return;}
    $('flashEmpty').classList.add('hidden');$('flashDeck').classList.remove('hidden');const e=flashDeck[flashIndex];
    $('cardChapter').textContent=e.chapter_title;$('cardTerm').textContent=e.term;$('cardDefinition').textContent=e.definition;
    $('cardExample').innerHTML=e.example?`<strong>Exemple :</strong> ${app.escapeHtml(e.example)}`:'';$('cardExample').classList.toggle('hidden',!e.example);
    $('cardFront').classList.toggle('hidden',revealed);$('cardBack').classList.toggle('hidden',!revealed);$('revealCard').textContent=revealed?'Revoir la notion':'Afficher la définition';$('flashCounter').textContent=`Carte ${flashIndex+1} / ${flashDeck.length}`;
  }
  function toggleCard(){if(!flashDeck.length)return;revealed=!revealed;renderFlash();}

  function exportPdf(){
    computeFiltered();
    if(!window.jspdf?.jsPDF){alert('Le module PDF n’est pas disponible.');return;}
    const {jsPDF}=window.jspdf;const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
    doc.setFont('helvetica','bold');doc.setFontSize(18);doc.text('Glossaire',105,18,{align:'center'});doc.setFontSize(11);doc.text('Première STMG',105,25,{align:'center'});
    const body=filteredEntries.map(e=>[e.term,e.chapter_title,e.definition]);
    doc.autoTable({startY:33,head:[['Notion','Chapitre','Définition']],body,theme:'grid',styles:{fontSize:8,cellPadding:2.5,valign:'top'},headStyles:{fillColor:[19,34,58]},columnStyles:{0:{cellWidth:38,fontStyle:'bold'},1:{cellWidth:52},2:{cellWidth:90}},margin:{bottom:14}});
    const totalPages=doc.internal.getNumberOfPages();
    for(let p=1;p<=totalPages;p++){doc.setPage(p);doc.setFontSize(7.5);doc.setTextColor(100);doc.text('Sciences de Gestion et du Numérique',14,291);doc.text(`Page ${p} / ${totalPages}`,105,291,{align:'center'});doc.text('M. CHAKER',196,291,{align:'right'});}
    doc.save(`Glossaire_SGdN_1re_STMG_${new Date().toISOString().slice(0,10)}.pdf`);
  }

  function subscribeRealtime(){if(!app.configured)return;app.db.channel('glossary-public').on('postgres_changes',{event:'*',schema:'public',table:'chapters'},loadData).on('postgres_changes',{event:'*',schema:'public',table:'glossary_entries'},loadData).subscribe();}

  buildAlphabet();
  $('searchInput').addEventListener('input',renderAll);$('chapterFilter').addEventListener('change',renderAll);$('resetFilters').addEventListener('click',resetFilters);$('exportPdf').addEventListener('click',exportPdf);
  $('navGlossary').addEventListener('click',()=>showView('glossary'));$('navFlashcards').addEventListener('click',()=>showView('flash'));
  $('flashChapter').addEventListener('change',()=>{shuffled=false;refreshFlashcards(true)});$('shuffleBtn').addEventListener('click',()=>{shuffled=true;refreshFlashcards(true);app.toast('Ordre aléatoire activé. Cliquez à nouveau pour remélanger.');});
  $('prevCard').addEventListener('click',()=>{if(!flashDeck.length)return;flashIndex=(flashIndex-1+flashDeck.length)%flashDeck.length;revealed=false;renderFlash()});$('nextCard').addEventListener('click',()=>{if(!flashDeck.length)return;flashIndex=(flashIndex+1)%flashDeck.length;revealed=false;renderFlash()});$('revealCard').addEventListener('click',toggleCard);$('studyCard').addEventListener('click',toggleCard);$('studyCard').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggleCard()}});$('restartCards').addEventListener('click',()=>{flashIndex=0;revealed=false;renderFlash()});
  loadData().then(subscribeRealtime);
})();
