  let projectSearchTerm='',projectSearchError='',projectSearching=false,projectChoices={};
  function projectChoice(p){
    const old=(state.editions||[]).find(e=>String(e.projectId)===String(p.id));
    const match=String(p.name||'').match(/^(.+?)\s+(?:Ausgabe\s*#?\s*|#)(\d+)\b/i);
    return projectChoices[p.id]||(projectChoices[p.id]={checked:false,magazine:old?.magazine||match?.[1]?.trim()||'',issue:old?.issue||match?.[2]||'',current:false});
  }
  function projectSearchPanel(){
    const rows=projectResults?.rows||[];
    return '<section class="m-panel m-section"><div class="m-panel-head"><h2>Magazine und Ausgaben</h2></div><div class="m-panel-body"><form data-form="project-search">'+field('HQ-Projekt suchen (Name oder Projektnummer)','term',projectSearchTerm,'text',true)+'<button class="m-button" '+(busy?'disabled':'')+'>Projekte in HQ suchen</button></form><div id="project-results" aria-live="polite">'+
      (projectSearching?'<p role="status">Projekte werden in HQ gesucht … '+rows.length+' Treffer bisher.</p>':'')+
      (projectSearchError?'<p class="m-error" role="alert">'+esc(projectSearchError)+'</p>':'')+
      (projectResults&&!projectSearching?'<p>'+rows.length+' Treffer für „'+esc(projectSearchTerm)+'“'+(projectResults.limited?' · Noch nicht vollständig. Bitte Suche eingrenzen oder erneut suchen.':'.')+'</p>':'')+
      (projectResults&&!rows.length&&!projectSearching&&!projectSearchError?'<p>Keine passenden Projekte gefunden. Bitte einen anderen Teil des Namens oder die genaue Projektnummer eingeben.</p>':'')+
      (rows.length&&!projectSearching?'<p>Gewünschte Projekte anhaken. Magazin und Ausgabennummer prüfen; Vorschläge aus dem Projektnamen sind noch keine Zuordnung. Bereits zugeordnete Projekte können erneut importiert werden.</p><form data-form="edition-selection">'+rows.map(p=>{
        const c=projectChoice(p),old=(state.editions||[]).find(e=>String(e.projectId)===String(p.id)),disabled=!c.checked||!!old;
        return '<fieldset data-project-row="'+esc(p.id)+'" class="m-plan"><legend><label><input type="checkbox" name="projectSelect" data-id="'+esc(p.id)+'" '+(c.checked?'checked':'')+'> '+esc(p.number+' · '+p.name)+'</label></legend>'+(c.checked?'<div class="m-form"><label class="m-field">Magazinname<input name="magazine-'+esc(p.id)+'" data-project-field="magazine" value="'+esc(c.magazine)+'" '+(disabled?'disabled':'required')+' maxlength="80"></label><label class="m-field">Ausgabennummer<input name="issue-'+esc(p.id)+'" data-project-field="issue" type="number" min="1" max="100000" step="1" value="'+esc(c.issue)+'" '+(disabled?'disabled':'required')+'></label><label class="m-project-current"><input type="checkbox" name="projectCurrent" data-id="'+esc(p.id)+'" '+(c.current?'checked':'')+' '+(!c.checked?'disabled':'')+'> Als aktuelle Verkaufsausgabe verwenden</label></div>':'')+(old?'<p>Bereits zugeordnet: '+esc(editionLabel(old))+'</p>':'')+'</fieldset>';
      }).join('')+'<button class="m-button m-primary" '+(busy?'disabled':'')+'>Ausgewählte Ausgaben importieren</button></form>':'')+'</div><p>Bestehende Zuordnungen:</p>'+(state.editions||[]).map(e=>'<p>'+esc(editionLabel(e))+' → '+esc(e.projectNumber+' · '+e.projectName)+'</p>').join('')+'</div></section>';
  }
  async function searchV1Projects(term){
    projectSearchTerm=term.trim();projectSearchError='';projectSearching=true;projectResults={rows:[],limited:true};projectChoices={};
    await act(async()=>{
      try{
        const seen=new Set();let skip=0;
        for(let page=0;page<50;page++){
          const result=await rpc('searchSalesProjects',projectSearchTerm,skip);
          if(!result||!Array.isArray(result.rows))throw new Error('HQ-Projektsuche hat kein gültiges Ergebnis geliefert.');
          for(const row of result.rows){if(seen.has(String(row.id)))throw new Error('HQ-Suchseiten enthalten doppelte Projekte. Bitte erneut suchen.');seen.add(String(row.id));projectResults.rows.push(row);}
          projectResults.limited=!!result.limited;render();
          if(!result.limited)break;
          if(!Number.isSafeInteger(result.nextSkip)||result.nextSkip<=skip)throw new Error('HQ-Suchseite konnte nicht fortgesetzt werden.');
          skip=result.nextSkip;
        }
        return {message:projectResults.rows.length+' Projekte gefunden. Ergebnisse stehen direkt unter der Suche.'};
      }catch(e){projectSearchError='Projektsuche fehlgeschlagen: '+e.message;throw new Error(projectSearchError);}
      finally{projectSearching=false;}
    });
    root.querySelector('#project-results')?.scrollIntoView({block:'nearest'});
  }
  async function importSelectedV1Projects(form){
    const choices=Array.from(form.querySelectorAll('[data-project-row]')).filter(row=>row.querySelector('[name="projectSelect"]').checked).map(row=>({projectId:row.dataset.projectRow,checked:row.querySelector('[name="projectSelect"]').checked,magazine:row.querySelector('[data-project-field="magazine"]').value,issue:row.querySelector('[data-project-field="issue"]').value,current:row.querySelector('[name="projectCurrent"]').checked})).filter(c=>c.checked);
    choices.forEach(c=>{projectChoices[c.projectId]={...c};});projectSearchError='';let ids=[];
    await act(async()=>{
      try{
        if(!choices.length||choices.length>200)throw new Error('Bitte 1 bis 200 Projekte anhaken.');
        if(state.importRun?.state==='running')throw new Error('Zuerst den laufenden Import unter Datenabgleich fortsetzen und abschließen.');
        const keys=choices.map(c=>c.magazine.trim().toLocaleLowerCase('de')+'#'+Number(c.issue));
        if(new Set(keys).size!==keys.length)throw new Error('Zwei ausgewählte Projekte haben dieselbe Magazin-/Ausgabenzuordnung. Bitte prüfen.');
        if(choices.some(c=>!c.magazine.trim()||!Number.isSafeInteger(Number(c.issue))||Number(c.issue)<1))throw new Error('Bitte Magazin und Ausgabennummer aller ausgewählten Projekte ausfüllen.');
        for(const choice of choices){const r=await rpc('saveSalesEditionConfig',choice);ids.push(r.id);if(choice.current)selectedEditionId=r.id;}
        state=await rpc('getSalesState');
      }catch(e){projectSearchError='Auswahl noch nicht gestartet: '+e.message+' Bereits gespeicherte Zuordnungen bleiben erhalten; erneutes Übernehmen legt keine zweite Ausgabe an.';throw new Error(projectSearchError);}
    });
    if(error){root.querySelector('#project-results')?.scrollIntoView({block:'nearest'});return;}
    view='import';await continueV1Import(false,ids);
  }
  function changeProjectChoice(e){
    const name=e.target.name;
    if(name==='projectSelect'||name==='projectCurrent'){
      const id=e.target.dataset.id,c=projectChoices[id];if(!c)return true;
      if(name==='projectSelect'){c.checked=e.target.checked;if(!c.checked)c.current=false;}
      else{Object.values(projectChoices).forEach(x=>x.current=false);c.current=e.target.checked;}
      render();return true;
    }
    if(e.target.dataset.projectField){const id=e.target.closest('[data-project-row]').dataset.projectRow;projectChoices[id][e.target.dataset.projectField]=e.target.value;return true;}
    return false;
  }
