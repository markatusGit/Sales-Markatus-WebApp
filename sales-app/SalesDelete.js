  // Customer deletion (R15): any user requests, the admin approves, the central HQ sync deletes. No trash bin.
  // HtmlService strips comments with a simple scanner: keep quoted text out of template placeholders and avoid double slashes in code.
  let deleteFormOpen=null,deletionRows=null,deletionConfirm=null;
  const deleteStates={requested:'Wartet auf Freigabe durch einen Admin',approved:'Freigegeben · wird beim nächsten HQ-Abgleich gelöscht',blocked:'Nicht gelöscht · erst aufräumen',failed:'Löschung angehalten',rejected:'Abgelehnt',done:'Gelöscht'};
  const deleteTexts={
    unsent:'<p>Dieser Kunde wurde noch nicht an HQ übertragen. Nach der Freigabe durch einen Admin wird er <strong>sofort und endgültig in der App gelöscht</strong>; seine noch nicht gesendeten Aufträge werden verworfen. In HQ passiert nichts. Es gibt keinen Papierkorb.</p>',
    hq:'<p>Nach der Freigabe durch einen Admin wird der Kunde beim nächsten HQ-Abgleich <strong>in HQ und in der App endgültig gelöscht</strong>, zusammen mit seinen Ansprechpartnern und der Kontakthistorie. Es gibt keinen Papierkorb.</p>',
    cleanup:'<p>Gibt es zu diesem Kunden noch Projekte, Belege, Planumsätze oder offene Aufträge, wird nicht gelöscht. Diese müssen vorher aufgeräumt werden. Kunden sollten möglichst nie gelöscht werden.</p>',
    confirmLocal:'wird sofort in der App gelöscht (war noch nicht in HQ).',
    confirmHq:'wird beim nächsten HQ-Abgleich in HQ und in der App gelöscht, mit Ansprechpartnern und Kontakthistorie.',
    adminNote:'<p class="m-note">Freigegebene Kunden werden beim nächsten HQ-Abgleich in HQ und in der App endgültig gelöscht, mit Ansprechpartnern und Kontakthistorie. Vorher wird in HQ erneut geprüft, dass keine Projekte, Belege oder Planumsätze bestehen. Noch nicht übertragene Kunden werden nach der Freigabe sofort in der App gelöscht.</p>'
  };
  function deleteCustomerButton(c){
    if(detail?.deletion&&['requested','approved'].includes(detail.deletion.state))return '';
    if(c.localDraftId&&c.syncState!=='synced'&&!['pending','ready'].includes(c.syncState))return '';
    return button('Kunde löschen','delete-customer',String(c.hqId||c.id));
  }
  function deleteCustomerPanel(c){
    const d=detail?.deletion,id=String(c.hqId||c.id),unsent=!c.hqId&&String(c.id).startsWith('draft_');let out='';
    if(d){
      const state=esc(deleteStates[d.state]||d.state),extra=d.message&&d.state!=='requested'?'<br>'+esc(d.message):'',by=esc(d.requestedBy||''),at=esc(dateLabel(d.requestedAt)),reason=esc(d.reason||'');
      out+='<div class="m-note" role="status" data-deletion-status><strong>Löschantrag: '+state+'</strong>'+extra+'<br><small>Gestellt von '+by+' am '+at+' · Grund: '+reason+'</small></div>';
    }
    if(deleteFormOpen===id){
      const intro=unsent?deleteTexts.unsent:deleteTexts.hq;
      out+='<form class="m-panel m-section" data-form="delete-request" data-company="'+esc(id)+'"><div class="m-panel-head"><h2>Kunde löschen</h2></div><div class="m-panel-body">'+intro+deleteTexts.cleanup+'<label class="m-field">Grund für die Löschung (Pflicht)<textarea name="reason" maxlength="500" required></textarea></label><div class="m-test-actions"><button type="submit" class="m-button m-primary">Löschantrag stellen</button>'+button('Abbrechen','delete-cancel',id)+'</div><p class="m-status" role="status"></p></div></form>';
    }
    return out;
  }
  function deletionRow(d){
    const key=(d.key||d.hqId)+':'+d.revision,open=['requested','failed','blocked'].includes(d.state);
    let actions='';
    if(open&&deletionConfirm===key)actions='<div class="m-note"><strong>Wirklich endgültig löschen?</strong> '+esc(d.name)+' '+(d.local?deleteTexts.confirmLocal:deleteTexts.confirmHq)+' Das lässt sich nicht rückgängig machen.</div><div class="m-test-actions">'+button('Ja, endgültig löschen','deletion-approve',key,true)+button('Abbrechen','deletion-confirm-cancel',key)+'</div>';
    else if(open)actions='<div class="m-test-actions">'+button(d.state==='requested'?'Löschung freigeben':'Erneut freigeben','deletion-confirm',key,true)+button(d.state==='requested'?'Ablehnen':'Antrag schließen','deletion-reject',key)+'</div>';
    const place=d.local?'noch nicht in HQ':'HQ-ID '+esc(d.hqId),decided=d.decidedBy?' · entschieden von '+esc(d.decidedBy)+' am '+esc(dateLabel(d.decidedAt)):'',note=d.message&&d.state!=='requested'?'<p class="m-muted">'+esc(d.message)+'</p>':'';
    return '<div class="m-row" data-deletion-row="'+esc(d.key||d.hqId)+'"><h3>'+esc(d.name)+' · '+place+'</h3><p>'+esc(deleteStates[d.state]||d.state)+'</p><p>Grund: '+esc(d.reason||'')+'</p><p><small>Gestellt von '+esc(d.requestedBy||'')+' am '+esc(dateLabel(d.requestedAt))+decided+'</small></p>'+note+actions+'</div>';
  }
  function deletionAdminPanel(){
    const rows=deletionRows,list=!rows?'<p>Die Liste wird nur auf Klick aus Firebase gelesen.</p>':!rows.length?'<p>Keine Löschanträge vorhanden.</p>':rows.map(deletionRow).join('');
    return '<section class="m-panel m-section" data-deletion-admin><div class="m-panel-head"><h2>Löschanträge für Kunden</h2>'+button(rows?'Neu laden':'Löschanträge anzeigen','deletions-load')+'</div><div class="m-panel-body">'+deleteTexts.adminNote+list+'</div></section>';
  }
  function deleteClick(a,id){
    if(a==='delete-customer'){deleteFormOpen=id;render();return true;}
    if(a==='delete-cancel'){deleteFormOpen=null;render();return true;}
    if(a==='deletion-confirm'){deletionConfirm=id;render();return true;}
    if(a==='deletion-confirm-cancel'){deletionConfirm=null;render();return true;}
    if(a==='deletions-load'){act(async()=>{deletionRows=(await rpc('listSalesCustomerDeletions')).deletions;deletionConfirm=null;return {message:'Löschanträge aus Firebase geladen.'};});return true;}
    if(a==='deletion-approve'||a==='deletion-reject'){
      const cut=String(id).lastIndexOf(':'),key=String(id).slice(0,cut),revision=String(id).slice(cut+1);
      act(async()=>{const r=await rpc('decideSalesCustomerDelete',{key,revision:Number(revision),approve:a==='deletion-approve'});deletionConfirm=null;deletionRows=(await rpc('listSalesCustomerDeletions')).deletions;return r;});return true;
    }
    return false;
  }
  function deleteSubmit(form,input){
    if(form.dataset.form!=='delete-request')return false;
    const id=form.dataset.company;
    act(async()=>{const r=await rpc('requestSalesCustomerDelete',{companyId:id,reason:input.reason});deleteFormOpen=null;if(detail&&r.deletion)detail={...detail,deletion:r.deletion};return r;},{preserve:true});
    return true;
  }
