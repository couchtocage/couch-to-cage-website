// Only selected operational roles require their own application questions.
// Nonselected questions are disabled, so Netlify receives only relevant answers.
(() => {
  const form = document.querySelector('form[name="ctc-team-application"]');
  const position = form?.elements.namedItem('position');
  const section = document.getElementById('ctcTeamRoleQuestions');
  const intro = document.getElementById('ctcTeamRoleIntro');
  const groups = [
    { role: 'Fighter Relations', id: 'ctcFighterRelationsQuestions', description: 'Tell us how you would support and coordinate assigned CTC fighters.' },
    { role: 'Fighter Recruitment', id: 'ctcFighterRecruitmentQuestions', description: 'Tell us how you would discover and connect with new fighters for CTC.' },
    { role: 'Sponsorship Outreach', id: 'ctcSponsorshipOutreachQuestions', description: 'Tell us how you would build relationships with sponsors and partners.' },
    { role: 'Social Media / Content', id: 'ctcSocialContentQuestions', description: 'Tell us how you would cover and promote CTC fighters and events.' },
    { role: 'Operations Support', id: 'ctcOperationsSupportQuestions', description: 'Tell us how you would support event and team logistics.' }
  ];
  if (!form || !position || !section || !intro) return;
  function updateRoleQuestions() {
    const selected = groups.find(group => group.role === position.value);
    section.hidden = !selected;
    intro.textContent = selected?.description || '';
    for (const group of groups) {
      const fieldGroup = document.getElementById(group.id);
      if (!fieldGroup) continue;
      const chosen = selected?.role === group.role;
      fieldGroup.hidden = !chosen;
      for (const field of fieldGroup.querySelectorAll('textarea')) {
        if (!chosen) field.value = '';
        field.disabled = !chosen;
        field.required = chosen;
      }
    }
  }
  const referred = document.getElementById('ctcTeamReferred');
  const referredByWrap = document.getElementById('ctcTeamReferredByWrap');
  const referredBy = document.getElementById('ctcTeamReferredBy');
  function updateReferral() {
    if (!referred || !referredBy || !referredByWrap) return;
    const yes = referred.value === 'Yes';
    referredByWrap.hidden = !yes;
    referredBy.disabled = !yes;
    referredBy.required = yes;
    if (!yes) referredBy.value = '';
  }
  referred?.addEventListener('change', updateReferral);
  updateReferral();
  position.addEventListener('change', updateRoleQuestions);
  updateRoleQuestions();
})();
