(() => {
  const app=window.GlossaryApp,$=id=>document.getElementById(id);let chapters=[],entries=[],pendingDelete=null;
  async function requireAdmin(){
    if(!app.configured){$('configError').classList.remove('hidden');return false;}
    const {data:{session}}=await app.db.auth.getSession();
    if(!session){showLogin();return false;}
    const {data,error}=await app.db.rpc('is_glossary_admin');
    if(error||!data){
      await app.db.auth.signOut();
      showLogin();
      $('loginError').textContent='Ce compte n’est pas autorisé à administrer le glossaire.';
      return false;
    }
    showAdmin(session.user.email);await loadData();return true;
  }
  function showLogin(){$('loginView').classList.remove('hidden');$('adminView').classList.add('hidden')}
  function showAdmin(email){$('loginView').classList.add('hidden');$('adminView').classList.remove('hidden');$('sessionLabel').textContent=`Connecté : ${email||'enseignant'}`}
  async function login(){
    $('loginError').textContent='';if(!app.configured){$('configError').classList.remove('hidden');return;}
    const {error}=await app.db.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});if(error){$('loginError').textContent=error.message;return;}await requireAdmin();
  }
  async function logout(){await app.db.auth.signOut();showLogin()}
  async function loadData(){
    const [{data:cs,error:ce},{data:es,error:ee}]=await Promise.all([app.db.from('chapters').select('*').order('position').order('title'),app.db.from('glossary_entries').select('*').order('term')]);
    if(ce||ee){app.toast(ce?.message||ee?.message);return;}chapters=cs||[];entries=es||[];render();
  }
  function options(selected=''){return chapters.map(c=>`<option value="${c.id}" ${String(c.id)===String(selected)?'selected':''}>${app.escapeHtml(c.title)}</option>`).join('')}
  function render(){
    $('entryChapter').innerHTML=options();$('editChapter').innerHTML=options();$('adminChapterFilter').innerHTML='<option value="">Tous les chapitres</option>'+options($('adminChapterFilter').value);
    $('chapterList').innerHTML=chapters.length?chapters.map(c=>`<div class="chapter-row"><div><strong>${app.escapeHtml(c.title)}</strong><div class="count">Ordre : ${c.position}</div></div><button class="mini-btn danger" data-delete-chapter="${c.id}">Supprimer</button></div>`).join(''):'<div class="empty">Aucun chapitre.</div>';
    renderEntries();
  }
  function renderEntries(){const q=app.normalize($('adminSearch').value),ch=$('adminChapterFilter').value,map=new Map(chapters.map(c=>[c.id,c.title]));const list=entries.filter(e=>(!ch||String(e.chapter_id)===ch)&&(!q||app.normalize(`${e.term} ${e.definition}`).includes(q))).sort((a,b)=>a.term.localeCompare(b.term,'fr',{sensitivity:'base'}));$('entryList').innerHTML=list.length?list.map(e=>`<div class="entry-row"><div><strong>${app.escapeHtml(e.term)}</strong><div class="count">${app.escapeHtml(map.get(e.chapter_id)||'')}</div><div style="margin-top:5px;color:#475467">${app.escapeHtml(e.definition)}</div></div><div class="row-actions"><button class="mini-btn" data-edit="${e.id}">Modifier</button><button class="mini-btn danger" data-delete-entry="${e.id}">Supprimer</button></div></div>`).join(''):'<div class="empty">Aucune notion.</div>'}
  async function addChapter(){const title=$('newChapter').value.trim();if(!title)return app.toast('Saisissez un nom de chapitre.');const position=Number($('chapterPosition').value)||0;const {error}=await app.db.from('chapters').insert({title,position});if(error)return app.toast(error.message);$('newChapter').value='';await loadData();app.toast('Chapitre ajouté.')}
  async function addEntry(){const term=$('term').value.trim(),chapter_id=Number($('entryChapter').value),definition=$('definition').value.trim(),example=$('example').value.trim();if(!term||!chapter_id||!definition)return app.toast('Notion, chapitre et définition sont obligatoires.');const {error}=await app.db.from('glossary_entries').insert({term,chapter_id,definition,example:example||null});if(error)return app.toast(error.message);$('term').value='';$('definition').value='';$('example').value='';await loadData();app.toast('Notion ajoutée.')}
  function askDelete(message,action){pendingDelete=action;$('confirmMessage').textContent=message;$('confirmModal').classList.remove('hidden')}
  function closeConfirm(){pendingDelete=null;$('confirmModal').classList.add('hidden')}
  async function deleteChapter(id){const c=chapters.find(x=>String(x.id)===String(id));if(!c)return;askDelete(`Supprimer « ${c.title} » et toutes les notions associées ?`,async()=>{const {error}=await app.db.from('chapters').delete().eq('id',id);if(error)return app.toast(error.message);await loadData();app.toast('Chapitre supprimé.')})}
  async function deleteEntry(id){const e=entries.find(x=>String(x.id)===String(id));if(!e)return;askDelete(`Supprimer la notion « ${e.term} » ?`,async()=>{const {error}=await app.db.from('glossary_entries').delete().eq('id',id);if(error)return app.toast(error.message);await loadData();app.toast('Notion supprimée.')})}
  function openEdit(id){const e=entries.find(x=>String(x.id)===String(id));if(!e)return;$('editId').value=e.id;$('editTerm').value=e.term;$('editChapter').innerHTML=options(e.chapter_id);$('editDefinition').value=e.definition;$('editExample').value=e.example||'';$('editModal').classList.remove('hidden')}
  async function saveEdit(){const id=$('editId').value,payload={term:$('editTerm').value.trim(),chapter_id:Number($('editChapter').value),definition:$('editDefinition').value.trim(),example:$('editExample').value.trim()||null};if(!payload.term||!payload.chapter_id||!payload.definition)return app.toast('Notion, chapitre et définition sont obligatoires.');const {error}=await app.db.from('glossary_entries').update(payload).eq('id',id);if(error)return app.toast(error.message);$('editModal').classList.add('hidden');await loadData();app.toast('Notion modifiée.')}
  function normalizeHeader(v){return app.normalize(v).replace(/[^a-z0-9]/g,'')}
  async function importExcel(){
    const file=$('excelFile').files[0];if(!file)return app.toast('Sélectionnez un fichier Excel.');
    try{const wb=XLSX.read(await file.arrayBuffer(),{type:'array'}),sheet=wb.Sheets[wb.SheetNames[0]],rows=XLSX.utils.sheet_to_json(sheet,{defval:''});if(!rows.length)throw new Error('Le tableau est vide.');
      const headers=Object.keys(rows[0]),find=(names)=>headers.find(h=>names.includes(normalizeHeader(h)));const hTerm=find(['notion','terme','concept']),hChapter=find(['chapitre','chapter']),hDef=find(['definition']),hEx=find(['exemple','precision']);if(!hTerm||!hChapter||!hDef)throw new Error('Colonnes requises introuvables : Notion, Chapitre, Définition.');
      const cleaned=rows.map(r=>({term:String(r[hTerm]).trim(),chapter:String(r[hChapter]).trim(),definition:String(r[hDef]).trim(),example:hEx?String(r[hEx]).trim():''})).filter(r=>r.term&&r.chapter&&r.definition);const chapterTitles=[...new Set(cleaned.map(r=>r.chapter))];
      const existing=new Map(chapters.map(c=>[app.normalize(c.title),c]));for(const title of chapterTitles){if(!existing.has(app.normalize(title))){const {data,error}=await app.db.from('chapters').insert({title,position:chapters.length+1}).select().single();if(error)throw error;chapters.push(data);existing.set(app.normalize(title),data)}}
      let ok=0;for(const r of cleaned){const chapter_id=existing.get(app.normalize(r.chapter)).id;const {error}=await app.db.from('glossary_entries').upsert({chapter_id,term:r.term,definition:r.definition,example:r.example||null},{onConflict:'chapter_id,term'});if(!error)ok++;}
      $('importReport').innerHTML=`<div class="notice"><strong>${ok}</strong> notion${ok>1?'s':''} importée${ok>1?'s':''} ou mise${ok>1?'s':''} à jour.</div>`;await loadData();app.toast('Import Excel terminé.');
    }catch(err){$('importReport').innerHTML=`<div class="error-banner">${app.escapeHtml(err.message||String(err))}</div>`}
  }

  $('loginBtn').addEventListener('click',login);$('password').addEventListener('keydown',e=>{if(e.key==='Enter')login()});$('logoutBtn').addEventListener('click',logout);$('addChapterBtn').addEventListener('click',addChapter);$('newChapter').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();addChapter()}});$('addEntryBtn').addEventListener('click',addEntry);$('importExcelBtn').addEventListener('click',importExcel);$('adminSearch').addEventListener('input',renderEntries);$('adminChapterFilter').addEventListener('change',renderEntries);
  $('chapterList').addEventListener('click',e=>{const b=e.target.closest('[data-delete-chapter]');if(b)deleteChapter(b.dataset.deleteChapter)});$('entryList').addEventListener('click',e=>{const eb=e.target.closest('[data-edit]'),db=e.target.closest('[data-delete-entry]');if(eb)openEdit(eb.dataset.edit);if(db)deleteEntry(db.dataset.deleteEntry)});
  $('closeEdit').addEventListener('click',()=> $('editModal').classList.add('hidden'));$('cancelEdit').addEventListener('click',()=> $('editModal').classList.add('hidden'));$('saveEdit').addEventListener('click',saveEdit);$('confirmClose').addEventListener('click',closeConfirm);$('confirmCancel').addEventListener('click',closeConfirm);$('confirmDelete').addEventListener('click',async()=>{if(!pendingDelete)return;const fn=pendingDelete;closeConfirm();await fn()});
  if(app.configured)app.db.auth.onAuthStateChange(()=>setTimeout(requireAdmin,0));requireAdmin();
})();
