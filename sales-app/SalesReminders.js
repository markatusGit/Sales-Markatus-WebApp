  let reminderDialog=null;
  function reminderDate(days=0){
    const parts=new Intl.DateTimeFormat('de-DE',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const fields=Object.fromEntries(parts.map(p=>[p.type,p.value]));
    return new Date(Date.UTC(Number(fields.year),Number(fields.month)-1,Number(fields.day)+days)).toISOString().slice(0,10);
  }
  function reminderSetRows(rows){
    state.reminders=rows;
    const home=viewCache.get('home');if(home)home.reminders=rows;
  }
  function reminderAccept(result){
    const id=result.reminder?.id||result.closedReminderId;
    if(!id)return;
    const rows=(state.reminders||[]).filter(row=>row.id!==id);
    if(result.reminder)rows.push(result.reminder);
    reminderSetRows(rows);
  }
  function reminderPanel(companyOnly=false){
    const rows=(state.reminders||[]).filter(r=>!companyOnly||r.companyRef===communicationKey()).sort((a,b)=>a.dueDate.localeCompare(b.dueDate)||a.id.localeCompare(b.id));
    if(companyOnly&&!rows.length)return '';
    const today=reminderDate(),canEdit=!salesUsesLogin()||salesCan('communication.create');
    const cards=rows.map(r=>{
      const status=r.dueDate<today?tag('Überfällig','warn'):r.dueDate===today?tag('Heute','warn'):'';
      return '<div class="m-row m-reminder-row" data-reminder-id="'+esc(r.id)+'"><div class="m-reminder-heading">'+(companyOnly?'':'<h3>'+button(r.companyName,'company',r.companyRef)+'</h3>')+'<time datetime="'+esc(r.dueDate)+'">'+esc(dateLabel(r.dueDate))+'</time>'+status+'</div>'+(r.content?'<p class="m-reminder-note">'+esc(r.content)+'</p>':'')+(canEdit?'<div class="m-test-actions">'+button('Verschieben','reminder-move',r.id)+button('Erfassen','reminder-capture',r.id,true)+'</div>':'')+'</div>';
    }).join('');
    return '<section class="'+(companyOnly?'m-reminders-in-history':'m-panel m-reminders')+'"><div class="m-panel-head"><h2>Wiedervorlagen</h2></div>'+ (cards||empty('Keine offenen Wiedervorlagen.'))+'</section>';
  }
  function reminderPage(){return head('Wiedervorlagen','Offene Termine von früh nach spät',button('Ansicht aktualisieren','reload'))+reminderPanel();}
  function reminderDialogHtml(){
    if(!reminderDialog)return '';
    const d=reminderDialog,alert=error?'<p class="m-dialog-error" role="alert">'+esc(error)+'</p>':'';
    const title=d.kind==='capture'?'Kommunikation erfassen':d.move?'Wiedervorlage verschieben':'Wiedervorlage';
    const form=d.kind==='capture'?communicationForm(d.model,d.contacts,true):'<form data-form="reminder-date">'+field('Wiedervorlagedatum','dueDate',d.dueDate,'date',true)+'<div class="m-capture-actions"><button class="m-button m-primary" '+(busy?'disabled':'')+'>Speichern</button>'+button('Abbrechen','reminder-cancel')+'</div></form>';
    return '<dialog class="m-contact-dialog m-reminder-dialog" aria-labelledby="reminder-dialog-title"><h2 id="reminder-dialog-title">'+title+'</h2><p>'+esc(d.companyName)+'</p>'+(d.kind==='capture'&&d.row.content?'<p class="m-reminder-note m-note">'+esc(d.row.content)+'</p>':'')+alert+form+'</dialog>';
  }
  function reminderClose(){reminderDialog=reminderDialog?.previous||null;error='';render();}
  function reminderAfterRender(){
    const dialog=root.querySelector('.m-reminder-dialog');if(!dialog)return;
    dialog.showModal();dialog.addEventListener('cancel',e=>{e.preventDefault();if(!busy)reminderClose();});
    const capture=dialog.querySelector('[data-form="reminder-capture"]');
    if(capture){capture.elements.communicationContact.required=true;if(reminderDialog.model.pending)capture.querySelectorAll('input,select,textarea').forEach(el=>el.disabled=true);}
  }
  root.addEventListener('click',e=>{
    const b=e.target.closest('[data-action^="reminder-"]');if(!b)return;
    e.stopImmediatePropagation();if(busy)return;
    const action=b.dataset.action,id=b.dataset.id;
    if(action==='reminder-cancel'){reminderClose();return;}
    if(action==='reminder-schedule'){
      const form=b.closest('form'),fromCapture=id==='capture',previous=fromCapture?reminderDialog:null;
      reminderDialog={kind:'date',dueDate:reminderDate(7),companyRef:previous?.row.companyRef||communicationKey(),companyName:previous?.companyName||detail.company.name,row:previous?.row,previous,
        contactRef:form.elements.communicationContact.value,content:form.elements.communicationText.value||previous?.row.content||''};
      error='';render();return;
    }
    const row=(state.reminders||[]).find(r=>r.id===id);if(!row)return;
    if(action==='reminder-move'){
      reminderDialog={kind:'date',dueDate:row.dueDate,companyRef:row.companyRef,companyName:row.companyName,row,move:true};
      error='';render();return;
    }
    if(action==='reminder-capture')act(async()=>{
      const customer=await loadCompany(row.companyRef),contacts=customer?.contacts||[];
      if(!customer?.company)throw Error('Der Kunde der Wiedervorlage ist nicht mehr verfügbar.');
      const person=contacts.find(c=>contactKey(c)===row.contactRef||String(c.id)===row.contactRef);
      reminderDialog={kind:'capture',row,companyName:customer.company.name,contacts,model:{contact:person?contactKey(person):contacts.length===1?contactKey(contacts[0]):'',time:localContactTime(),text:''}};
    });
  });
  root.addEventListener('input',e=>{
    if(e.target.form?.dataset.form!=='reminder-capture')return;
    const model=reminderDialog.model;
    if(e.target.name==='communicationText')model.text=e.target.value;
    if(e.target.name==='communicationTime')model.time=e.target.value;
    if(e.target.name==='communicationContact')model.contact=e.target.value;
  });
  root.addEventListener('change',e=>{
    if(e.target.form?.dataset.form==='reminder-capture'&&e.target.name==='communicationContact')reminderDialog.model.contact=e.target.value;
  });
  root.addEventListener('submit',e=>{
    const form=e.target,kind=form.dataset.form;if(!['reminder-date','reminder-capture'].includes(kind))return;
    e.preventDefault();e.stopImmediatePropagation();if(busy)return;
    const d=reminderDialog;
    if(kind==='reminder-date'){
      if(!form.reportValidity())return;
      const dueDate=form.elements.dueDate.value;
      if(!d.requestId||d.dueDate!==dueDate)d.requestId=communicationId();
      d.dueDate=dueDate;
      const input={companyRef:d.companyRef,dueDate,requestId:d.requestId,...(d.row?{id:d.row.id,revision:d.row.revision}:{}),...(!d.move?{contactRef:d.contactRef,content:d.content}:{})};
      act(async()=>{
        const result=await rpc('saveSalesReminder',input);reminderAccept(result);
        if(!d.row&&view==='company'){const model=communicationDraft();model.text='';model.scrollToTop=true;}
        reminderDialog=null;return result;
      });return;
    }
    if(!d.model.pending){
      form.elements.communicationText.required=true;
      if(!form.reportValidity())return;
      const date=new Date(form.elements.communicationTime.value);if(!Number.isFinite(date.getTime()))return;
      d.model.pending={companyRef:d.row.companyRef,reminderId:d.row.id,reminderRevision:d.row.revision,requestId:communicationId(),contactRef:form.elements.communicationContact.value,contactOn:date.toISOString(),content:form.elements.communicationText.value,notReached:false};
    }
    act(async()=>{
      const result=await rpc('saveSalesCommunication',d.model.pending);reminderAccept(result);
      if(detail?.company&&communicationKey()===d.row.companyRef)acceptCommunicationResult(result);
      else companyCache.delete(String(d.row.companyRef));
      reminderDialog=null;return result;
    });
  });
