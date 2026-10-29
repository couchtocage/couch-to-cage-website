// CTC fighter registration attribution. Show detail only for referrals/other.
(()=>{const source=document.getElementById('ctcReferralSource'),wrap=document.getElementById('ctcReferralDetailsWrap'),detail=document.getElementById('ctcReferralDetails');
 if(!source||!wrap||!detail)return;
 const update=()=>{const show=['Gym / Coach','Friend / Fighter Referral','Event / Promotion','Other'].includes(source.value);wrap.hidden=!show;detail.disabled=!show;detail.required=source.value==='Other';if(!show)detail.value='';};
 source.addEventListener('change',update);update();
})();
