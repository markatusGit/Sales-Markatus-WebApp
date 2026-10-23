  const SALES_LOGIN_CONFIG="AUTH_RUNTIME_CONFIG";
  let salesLoginSession=null,salesLoginPending=null,salesUserRows=[],salesUserCursor=null,salesInvitationLink='';
  let salesSetupConfig=null,salesSetupBound=false,salesNewRelease='';
  const salesUsesLogin=()=>SALES_LOGIN_CONFIG?.enabled===true;
  const salesLoginOrigin=()=>salesUsesLogin()?SALES_LOGIN_CONFIG.origin:salesSetupConfig?.origin;
  function salesUpdatePage(release){
    const url=new URL(SALES_LOGIN_CONFIG.appUrl);url.searchParams.set('v',release);if(SALES_LOGIN_CONFIG.invitation)url.searchParams.set('invite',SALES_LOGIN_CONFIG.invitation);
    return '<div class="m-login"><h1>App wurde aktualisiert</h1><p>Bitte die aktuelle Version öffnen. Deine Benutzerfreigabe bleibt erhalten.</p><p><a class="m-button m-primary" href="'+esc(url.href)+'" target="_top">Aktuelle Version öffnen</a></p><p>Oberfläche: '+esc(UI_BUILD)+' · Server: '+esc(release)+'</p></div>';
  }
  function salesSetupPanel(){return '<section class="m-panel m-section"><div class="m-panel-head"><h2>Benutzeranmeldung einrichten</h2></div><div class="m-panel-body"><p>Der bisherige Google-Zugang bleibt bis zur Aktivierung erhalten.</p>'+button('Einrichtung vorbereiten','auth-setup')+(salesSetupConfig?button('Administratorkonto bestätigen','auth-login'):'')+(salesSetupBound?button('Benutzeranmeldung aktivieren','auth-enable'):'')+'</div></section>';}
  function salesDirectRpc(name,...args){return new Promise((resolve,reject)=>google.script.run.withSuccessHandler(resolve).withFailureHandler(e=>reject(Error(e?.message||'Anfrage fehlgeschlagen.')))[name](...args));}
  function salesForgetLogin(text=''){
    salesLoginSession=null;salesLoginPending?.popup?.close();salesLoginPending=null;
    state=null;detail=null;preview=null;audit=null;businessEditor=null;contactDialog=null;formDraft=null;salesUserRows=[];salesUserCursor=null;salesInvitationLink='';
    projectResults=null;companyResults=null;unassignedData=null;storageInventory=null;projectChoices={};projectSearchTerm='';projectSearchError='';selected=null;selectedEditionId='';search='';message='';
    customerListObserver?.disconnect();customerListObserver=null;
    for(const cache of [companyCache,editionCache,viewCache,communicationDrafts,contactDialogDrafts])cache.clear();loadedViews.clear();error=text;view='home';
    if(communicationClock){clearInterval(communicationClock);communicationClock=null;}root.classList.remove('m-customer-open');document.body.classList.remove('sales-customer-open');render();
  }
  function salesLoginPage(){return '<div class="m-login"><h1>Sales Markatus</h1><p>'+(SALES_LOGIN_CONFIG.invitation?'Du wurdest eingeladen. Bitte dein Konto bestätigen.':'Bitte mit deinem freigegebenen Konto anmelden.')+'</p><p role="alert">'+esc(error)+'</p>'+button('Anmelden / Einladung aktivieren','auth-login','','true')+'</div>';}
  async function salesBeginLogin(){
    if(salesLoginPending&&Date.now()-salesLoginPending.createdAt>=5*60000){salesLoginPending.popup.close();salesLoginPending=null;}
    if(salesLoginPending&&!salesLoginPending.popup.closed){salesLoginPending.popup.focus();return;}
    const popup=window.open('about:blank','sales-auth','popup,width=520,height=760');if(!popup){error='Bitte das Anmeldefenster im Browser erlauben.';render();return;}
    try{
      const bytes=crypto.getRandomValues(new Uint8Array(48)),verifier=Array.from(bytes,n=>n.toString(16).padStart(2,'0')).join(''),stateKey=Array.from(crypto.getRandomValues(new Uint8Array(24)),n=>n.toString(16).padStart(2,'0')).join('');
      const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier)),challenge=btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
      const response=await salesDirectRpc('beginSalesLogin',{origin:location.origin,state:stateKey,challenge,release:APP_RELEASE});
      if(response.reloadRequired){popup.close();salesNewRelease=response.release;render();return;}
      const origin=new URL(response.origin).origin;if(origin!==salesLoginOrigin())throw Error('Anmeldeursprung stimmt nicht überein.');
      salesLoginPending={popup,verifier,state:stateKey,attempt:response.attempt,createdAt:Date.now()};
      popup.location.href=origin+'/auth/#'+new URLSearchParams({origin:location.origin,state:stateKey,attempt:response.attempt,...(SALES_LOGIN_CONFIG.invitation?{invitation:SALES_LOGIN_CONFIG.invitation}:{})});
    }catch(e){popup.close();salesLoginPending=null;error=e.message;render();}
  }
  if(typeof window!=='undefined')window.addEventListener('message',async event=>{
    const pending=salesLoginPending;if(!pending||pending.finishing||Date.now()-pending.createdAt>5*60000||event.origin!==salesLoginOrigin()||event.source!==pending.popup||event.data?.type!=='sales-firebase-login'||event.data.state!==pending.state||event.data.attempt!==pending.attempt)return;
    pending.finishing=true;
    try{
      const result=await salesDirectRpc('finishSalesLogin',{attempt:pending.attempt,verifier:pending.verifier,state:pending.state,idToken:event.data.idToken,refreshToken:event.data.refreshToken,invitation:SALES_LOGIN_CONFIG.invitation||'',release:APP_RELEASE});
      if(result.reloadRequired){pending.popup.close();salesLoginPending=null;salesNewRelease=result.release;render();return;}
      salesLoginSession={id:result.session,revision:result.user.revision};pending.popup.postMessage({type:'sales-login-complete',state:pending.state},salesLoginOrigin());salesLoginPending=null;
      SALES_LOGIN_CONFIG.invitation='';try{google.script.history?.replace({}, {}, '');}catch{} // Remove the consumed invitation from this tab's URL.
      if(!salesUsesLogin()){salesSetupBound=true;message='Administratorkonto bestätigt. Die Benutzeranmeldung kann jetzt aktiviert werden.';render();return;}
      error='';await act(async()=>{state=await rpc('getSalesLeanState');loadedViews.add('home');});
    }catch(e){pending.popup.close();salesLoginPending=null;error=e.message;render();}
  });
  async function salesRpcWithLogin(target,args){
    if(!salesLoginSession)throw Error('AUTH_REQUIRED: Bitte anmelden.');
    const response=await salesDirectRpc('salesAuthenticatedRpc',salesLoginSession.id,target,args);
    if(response.identity.revision!==salesLoginSession.revision){salesForgetLogin('Deine Rechte wurden geändert. Bitte erneut anmelden.');throw Error('AUTH_REQUIRED: Rechte geändert.');}
    if(state)state.user=response.identity;return response.result;
  }
  function salesPermissionFields(values={},owner=false){return SALES_PERMISSION_CATALOG.map(([key,label,group],i)=>'<label class="m-check"><input type="checkbox" name="permission:'+key+'" '+(values[key]||SALES_PERMISSION_BASE.includes(key)?'checked':'')+' '+(owner||SALES_PERMISSION_BASE.includes(key)?'disabled':'')+'>'+esc(label)+'</label>').join('');}
  function salesUsersPanel(){
    const users=salesUserRows.map(u=>'<details class="m-row"><summary>'+esc(u.email)+' · '+(u.status==='active'?'Aktiv':'Gesperrt')+'</summary><form data-form="auth-user" data-uid="'+esc(u.uid)+'" data-revision="'+u.revision+'">'+salesPermissionFields(u.permissions,u.uid===state.user.uid)+'<label class="m-field">Zugang<select name="status" '+(u.uid===state.user.uid?'disabled':'')+'><option value="active" '+(u.status==='active'?'selected':'')+'>Aktiv</option><option value="disabled" '+(u.status==='disabled'?'selected':'')+'>Gesperrt</option></select></label><button class="m-button" '+(u.uid===state.user.uid?'disabled':'')+'>Rechte speichern</button></form></details>').join('');
    return '<section class="m-panel m-section"><div class="m-panel-head"><h2>Benutzer und Rechte</h2>'+button('Benutzer laden','auth-users')+'</div><div class="m-panel-body"><form data-form="auth-invite"><h3>Benutzer freigeben</h3>'+field('E-Mail-Adresse','email','','email',true)+salesPermissionFields()+'<p class="m-muted">Neue Benutzer lesen zunächst nur Mein Tag und Kunden. Löschen sowie noch nicht vorhandene Funktionen bleiben gesperrt.</p><button class="m-button m-primary">Einladungslink erstellen</button></form>'+(salesInvitationLink?'<label class="m-field">Einladungslink · 48 Stunden gültig<input readonly data-invitation-link value="'+esc(salesInvitationLink)+'"></label>'+button('Einladungslink kopieren','auth-copy'):'')+'</div>'+users+(salesUserCursor?button('Weitere Benutzer','auth-more'):'')+'</section>';
  }
  function salesUiPermissions(){
    if(!salesUsesLogin()||!state)return;
    const navRules={home:'home.read',customers:'customers.read',magazine:'magazine.read',contacts:'directory.read',invoices:'finance.read',import:'sync.read',admin:'settings.read',reminders:'unavailable',test:'owner',new:'company.create',change:'company.edit'};
    for(const b of root.querySelectorAll('[data-action="nav"]')){const rule=navRules[b.dataset.id];if(rule&&!salesCan(rule)&&!(b.dataset.id==='admin'&&state.user.admin))b.hidden=true;}
    const actionRules={'edit-business':'company.edit','v1-sync':'sync.run','pause-import':'sync.run','v1-editions':'owner','project-search':'settings.edit','exclude-document':'owner','include-document':'owner','preview':'sync.read','inventory-start':'owner','inventory-next':'owner','sync-company':'sync.run','sync-history':'sync.run','unassigned':'sync.read'};
    for(const b of root.querySelectorAll('[data-action]')){
      let rule=actionRules[b.dataset.action];if(b.dataset.action==='edit-business'&&b.dataset.id.startsWith('contact:'))rule='contact.edit';
      if(rule&&(rule==='owner'?!state.user.admin:!salesCan(rule)))b.hidden=true;
    }
    const capture=root.querySelector('.m-capture');if(capture&&!salesCan('communication.create'))capture.innerHTML='<h2>Kommunikation</h2><p>Du hast Leserechte. Neue Einträge können von berechtigten Personen erfasst werden.</p>';
    if(!salesCan('contact.create'))root.querySelector('[name="communicationContact"] option[value="__new"]')?.remove();
    if(!salesCan('finance.read')){
      for(const el of root.querySelectorAll('.m-list-end'))el.remove();
      root.querySelector('[name="v1History"]')?.closest('label')?.remove();
      for(const form of root.querySelectorAll('form[data-form="edition"]'))form.hidden=true;
    }
    if(!salesCan('projects.read'))root.querySelector('[data-customer-list="projects"]')?.remove();
    if(!salesCan('settings.edit'))for(const form of root.querySelectorAll('form[data-form="edition"],form[data-form="edition-selection"],form[data-form="project-search"]'))form.querySelectorAll('input,select,button').forEach(el=>el.disabled=true);
  }
  root.addEventListener('click',e=>{
    const b=e.target.closest('[data-action]');if(!b||!b.dataset.action.startsWith('auth-'))return;e.stopImmediatePropagation();
    if(b.dataset.action==='auth-login')salesBeginLogin();
    if(b.dataset.action==='auth-setup')act(async()=>{await salesDirectRpc('saveSalesAuthSetup',{allowedOrigins:[location.origin]});salesSetupConfig=await salesDirectRpc('getSalesAuthSetup');return {message:'Vorbereitet. Bitte jetzt das bisherige Administratorkonto bestätigen.'};});
    if(b.dataset.action==='auth-enable')act(async()=>{const r=await salesDirectRpc('enableSalesLogin',salesLoginSession?.id);salesSetupBound=false;return r;});
    if(b.dataset.action==='auth-logout')act(async()=>{try{await rpc('logoutSalesUser');}finally{salesForgetLogin();}});
    if(b.dataset.action==='auth-users'||b.dataset.action==='auth-more')act(async()=>{const r=await rpc('listSalesUsers',b.dataset.action==='auth-more'?salesUserCursor:null);salesUserRows=b.dataset.action==='auth-more'?[...salesUserRows,...r.users]:r.users;salesUserCursor=r.next;});
    if(b.dataset.action==='auth-copy')navigator.clipboard.writeText(salesInvitationLink).catch(()=>root.querySelector('[data-invitation-link]')?.select());
  });
  root.addEventListener('submit',e=>{
    const form=e.target;if(!['auth-user','auth-invite'].includes(form.dataset.form))return;e.preventDefault();e.stopImmediatePropagation();if(busy||!form.reportValidity())return;
    const permissions=Object.fromEntries(SALES_PERMISSION_CATALOG.map(([key])=>[key,form.querySelector('[name="permission:'+key+'"]')?.checked===true]));
    act(async()=>{if(form.dataset.form==='auth-invite'){const r=await rpc('createSalesUserInvitation',{email:form.elements.email.value,permissions});salesInvitationLink=r.url;return r;}
      const r=await rpc('updateSalesUser',{uid:form.dataset.uid,revision:Number(form.dataset.revision),status:form.elements.status.value,permissions});salesUserRows=salesUserRows.map(u=>u.uid===r.user.uid?r.user:u);return r;});
  });
