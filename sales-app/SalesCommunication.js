  // Session-only drafts and DOM updates: typing, contact selection and the clock never call the server.
  const communicationDrafts=new Map(),contactDialogDrafts=new Map();let communicationClock=null,contactDialog=null;
  const communicationKey=()=>detail?.communicationRef||(detail?.company?.localDraftId?'draft_'+detail.company.localDraftId:String(selected));
  const contactKey=c=>String(c.localContactId||c.id);
  const localContactTime=()=>{const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,16);};
  const communicationId=()=>Array.from(crypto.getRandomValues(new Uint32Array(4)),n=>n.toString(16).padStart(8,'0')).join('');
  function communicationDraft(){
    const key=communicationKey();let draft=communicationDrafts.get(key);
    if(!draft){draft={text:'',contact:'',manualTime:false,time:localContactTime(),tab:'details',leftScroll:0,historyScroll:0};communicationDrafts.set(key,draft);}
    const contacts=detail?.contacts||[],has=id=>contacts.some(c=>contactKey(c)===String(id)||String(c.id)===String(id));
    if(!has(draft.contact)||draft.historySource!==detail?.histories&&!draft.text&&!draft.pending){
      const latest=(detail?.histories||[]).filter(h=>!h.documentDispatch&&!['SentDocument','Task'].includes(h.contactHistoryChannel)&&Number.isFinite(Date.parse(h.contactOn))).slice().sort((a,b)=>Date.parse(b.contactOn)-Date.parse(a.contactOn)).find(h=>has(h.contactPersonId));
      draft.contact=latest?contactKey(contacts.find(c=>contactKey(c)===String(latest.contactPersonId)||String(c.id)===String(latest.contactPersonId))):contacts.length===1?contactKey(contacts[0]):'';
    }
    draft.historySource=detail?.histories;return draft;
  }
  function communicationPanel(){
    const d=communicationDraft(),contacts=detail?.contacts||[];
    if(!d.manualTime&&!d.pending)d.time=localContactTime();
    const options=[{id:'',name:'Bitte auswählen'},...contacts.map(c=>({id:contactKey(c),name:[c.firstName,c.lastName].filter(Boolean).join(' ')})),{id:'__new',name:'+ Neuen Ansprechpartner anlegen'}];
    return '<aside class="m-communication m-panel" aria-label="Kundenkommunikation"><div class="m-capture"><h2>Kommunikation</h2><p class="m-muted m-customer-label">'+esc(detail?.company?.name||'')+'</p><form data-form="communication" novalidate><div class="m-capture-fields">'+select('Ansprechpartner','communicationContact',options,d.contact)+field('Datum / Uhrzeit','communicationTime',d.time,'datetime-local',true)+'</div><label class="m-field" for="communication-text">Gespräch / Notiz</label><textarea id="communication-text" aria-label="Gespräch / Notiz" name="communicationText" maxlength="10000" placeholder="Was wurde besprochen?">'+esc(d.text)+'</textarea><div class="m-capture-actions"><button class="m-button m-primary" type="submit" '+(busy?'disabled':'')+'>Speichern</button><button class="m-button" type="submit" name="notReached" value="true" '+(busy?'disabled':'')+'>Nicht erreicht</button></div></form></div><div class="m-history-scroll" tabindex="0" aria-label="Kontakt-Historie scrollen">'+historyPanel(detail?.company||{})+'</div></aside>';
  }
  function contactDialogHtml(){
    if(!contactDialog||contactDialog.companyRef!==communicationKey())return '';
    const v=contactDialog.values;
    return '<dialog class="m-contact-dialog" aria-labelledby="contact-dialog-title"><form data-form="communication-contact"><h2 id="contact-dialog-title">Ansprechpartner anlegen</h2><p>'+esc(detail.company.name)+'</p><div class="m-form">'+field('Vorname','firstName',v.firstName||'','text',true)+field('Nachname','lastName',v.lastName||'','text',true)+field('Position','position',v.position||'')+field('E-Mail','eMail',v.eMail||'','email')+field('Mobiltelefon','phoneMobile',v.phoneMobile||'','tel')+field('Festnetztelefon','phoneLandline',v.phoneLandline||'','tel')+'</div><p class="m-muted">Vorname und Nachname sind Pflicht. Weitere Angaben sind optional.</p><p class="m-dialog-error" role="alert">'+esc(contactDialog.error||'')+'</p><div class="m-capture-actions"><button class="m-button m-primary" '+(busy?'disabled':'')+'>Anlegen</button>'+button('Abbrechen','communication-cancel')+'</div></form></dialog>';
  }
  function company(){
    const c=detail?.company||companies().find(x=>String(x.id)===String(selected));
    if(!detail&&c)detail={company:{companyTypes:[],responsibleUsers:[],customFields:[],...c},contacts:[],histories:[]};
    if(!c)return empty('Firma fehlt.');
    const d=communicationDraft();
    return '<div class="m-customer-tabs" role="tablist" aria-label="Kundenansicht"><button type="button" role="tab" data-action="communication-tab" data-id="details" aria-controls="customer-details" aria-selected="'+(d.tab==='details')+'">Kundendaten</button><button type="button" role="tab" data-action="communication-tab" data-id="communication" aria-controls="customer-communication" aria-selected="'+(d.tab==='communication')+'">Kommunikation</button></div><div class="m-customer-workspace" data-tab="'+d.tab+'"><div id="customer-details" class="m-customer-details" tabindex="0" aria-label="Kundendaten scrollen">'+companyDetails()+'</div><div id="customer-communication" class="m-communication-column">'+communicationPanel()+'</div></div>'+contactDialogHtml();
  }
  function communicationBeforeRender(){
    if(!root.querySelector('.m-customer-workspace'))return;
    const d=communicationDrafts.get(root.querySelector('[data-communication-ref]')?.dataset.communicationRef||communicationKey());
    if(d){d.leftScroll=root.querySelector('.m-customer-details')?.scrollTop||0;d.historyScroll=root.querySelector('.m-history-scroll')?.scrollTop||0;}
  }
  function communicationAfterRender(){
    if(communicationClock){clearInterval(communicationClock);communicationClock=null;}
    root.classList?.toggle('m-customer-open',view==='company');
    document.body?.classList.toggle('sales-customer-open',view==='company');
    const box=root.querySelector('.m-customer-workspace');if(!box)return;
    box.dataset.communicationRef=communicationKey();const d=communicationDraft();
    if(d.scrollToTop){d.historyScroll=0;d.scrollToTop=false;}
    root.querySelector('.m-customer-details').scrollTop=d.leftScroll;
    root.querySelector('.m-history-scroll').scrollTop=d.historyScroll;
    root.querySelector('[name="communicationContact"]').required=true;
    if(busy||d.pending)root.querySelectorAll('.m-capture input,.m-capture select,.m-capture textarea').forEach(el=>el.disabled=true);
    if(d.pending&&!busy){const hint=document.createElement('p');hint.className='m-muted';hint.textContent='Speicherung noch nicht bestätigt. Erneut anklicken prüft denselben Auftrag.';root.querySelector('.m-capture').append(hint);}
    if(busy||contactDialog?.pending)root.querySelectorAll('.m-contact-dialog input').forEach(el=>el.disabled=true);
    const dialog=root.querySelector('dialog');
    if(dialog){dialog.showModal();dialog.addEventListener('cancel',e=>{e.preventDefault();if(!busy)closeContactDialog();});if(!busy)dialog.querySelector('[name="firstName"]').focus();}
    communicationClock=setInterval(()=>{
      if(view!=='company'||d.manualTime||d.pending||busy)return;
      d.time=localContactTime();const input=root.querySelector('[name="communicationTime"]');if(input&&document.activeElement!==input)input.value=d.time;
    },1000);
  }
  function closeContactDialog(){contactDialog=null;render();root.querySelector('[name="communicationContact"]')?.focus();}
  function acceptCommunicationResult(r){
    if(r.contact){
      const c={...r.contact,id:r.contact.hqId||r.contact.id,localContactId:r.contact.id};
      detail.contacts=[...(detail.contacts||[]).filter(x=>contactKey(x)!==c.localContactId),c];
      communicationDraft().contact=c.localContactId;
    }
    if(r.communication){
      const h={...r.communication,contactPersonId:r.communication.contactRef,source:'app'};
      detail.histories=[...(detail.histories||[]).filter(x=>x.jobId!==h.jobId),h];
    }
    companyCache.set(String(selected),detail);
  }
  root.addEventListener('input',e=>{
    const form=e.target.closest('form');if(!form)return;
    if(form.dataset.form==='communication'){
      const d=communicationDraft();
      if(e.target.name==='communicationText')d.text=e.target.value;
      if(e.target.name==='communicationTime'){d.time=e.target.value;d.manualTime=true;}
      if(!d.pending)d.request=null;
    }
    if(form.dataset.form==='communication-contact'&&contactDialog)contactDialog.values=Object.fromEntries(new FormData(form));
  });
  root.addEventListener('change',e=>{
    if(e.target.name!=='communicationContact')return;e.stopImmediatePropagation();const d=communicationDraft();
    if(e.target.value==='__new'){
      e.target.value=d.contact;const key=communicationKey();contactDialog=contactDialogDrafts.get(key)||{companyRef:key,requestId:communicationId(),values:{}};contactDialogDrafts.set(key,contactDialog);render();
    }else d.contact=e.target.value;
  });
  root.addEventListener('click',e=>{
    const b=e.target.closest('[data-action]');if(!b)return;
    if(b.dataset.action==='communication-cancel'){e.stopImmediatePropagation();if(!busy)closeContactDialog();}
    if(b.dataset.action==='communication-tab'){e.stopImmediatePropagation();if(!busy){communicationDraft().tab=b.dataset.id;render();}}
  });
  root.addEventListener('submit',e=>{
    const form=e.target,kind=form.dataset.form;if(!['communication','communication-contact'].includes(kind))return;
    e.preventDefault();e.stopImmediatePropagation();if(busy)return;
    if(kind==='communication-contact'){
      if(!form.reportValidity())return;
      const dialog=contactDialog;if(!dialog.pending)dialog.values=Object.fromEntries(new FormData(form));
      if(!dialog.pending)dialog.pending={...dialog.values,companyRef:dialog.companyRef,requestId:dialog.requestId};
      act(async()=>{
        try{const r=await rpc('createSalesCustomerContact',dialog.pending);acceptCommunicationResult(r);contactDialogDrafts.delete(dialog.companyRef);contactDialog=null;return r;}
        catch(e){if(/bereits vorhanden|Pflichtfeld|gültige E-Mail/.test(e.message))dialog.pending=null;dialog.error=e.message;throw e;}
      });return;
    }
    const d=communicationDraft(),notReached=e.submitter?.name==='notReached';
    const text=form.elements.communicationText;text.required=!notReached;if(!form.reportValidity())return;
    if(!d.pending){
      if(!d.manualTime)d.time=localContactTime();
      const date=new Date(d.time);if(!Number.isFinite(date.getTime()))return;
      d.pending={companyRef:communicationKey(),requestId:communicationId(),contactRef:d.contact,content:d.text,notReached,contactOn:date.toISOString()};
    }
    act(async()=>{
      const r=await rpc('saveSalesCommunication',d.pending);acceptCommunicationResult(r);
      d.text='';d.pending=null;d.manualTime=false;d.time=localContactTime();d.scrollToTop=true;historyFilter='all';return r;
    });
  });
