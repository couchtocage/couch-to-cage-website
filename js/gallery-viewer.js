
(function () {
  var box = document.getElementById('galleryLightbox');
  var big = document.getElementById('lightboxImage');
  if (!box || !big) return;

  var index = 0, startX = null;
  function items(){ return Array.prototype.slice.call(document.querySelectorAll('.family-grid .gallery-item')); }
  function show(i){
    var all=items(); if(!all.length) return;
    index=(i+all.length)%all.length;
    var img=all[index].querySelector('img'); if(!img) return;
    big.src=img.currentSrc || img.src;
    big.alt=img.alt || 'Expanded CTC Family photo';
  }
  function open(i){
    show(i);
    box.hidden=false;
    box.classList.add('is-open');
    document.body.classList.add('lightbox-open');
  }
  function close(){
    box.hidden=true;
    box.classList.remove('is-open');
    document.body.classList.remove('lightbox-open');
  }

  document.addEventListener('click',function(e){
    var tile=e.target.closest && e.target.closest('.family-grid .gallery-item');
    if(tile){ e.preventDefault(); e.stopPropagation(); open(items().indexOf(tile)); return; }
    if(e.target.closest && e.target.closest('.lightbox-close')){ close(); return; }
    if(e.target.closest && e.target.closest('.lightbox-prev')){ show(index-1); return; }
    if(e.target.closest && e.target.closest('.lightbox-next')){ show(index+1); return; }
    if(e.target===box) close();
  }, true);

  box.addEventListener('touchstart',function(e){ startX=e.changedTouches[0].clientX; },{passive:true});
  box.addEventListener('touchend',function(e){
    if(startX===null)return;
    var dx=e.changedTouches[0].clientX-startX; startX=null;
    if(Math.abs(dx)>40) show(index+(dx<0?1:-1));
  },{passive:true});

  document.addEventListener('keydown',function(e){
    if(box.hidden)return;
    if(e.key==='Escape')close();
    if(e.key==='ArrowLeft')show(index-1);
    if(e.key==='ArrowRight')show(index+1);
  });
})();
