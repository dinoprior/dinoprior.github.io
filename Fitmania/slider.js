document.addEventListener('DOMContentLoaded', () => {
  const wrapper = document.getElementById('sliderWrapper');
  const track = document.getElementById('sliderTrack');
  const slides = track ? Array.from(track.querySelectorAll('.slide')) : [];
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const dotsContainer = document.getElementById('dots');

  if (!wrapper || !track || slides.length === 0) return;

  let index = 0;
  let visible = 1;
  let slideW = 0;

  // drag state
  let isDragging = false;
  let startX = 0;
  let startTranslate = 0;
  let currentX = 0;
  let justDragged = false;

  function calcVisible(){ return window.innerWidth >= 768 ? 3 : 1; }

  function layout(){
    visible = Math.min(calcVisible(), slides.length);
    const wrapperW = wrapper.offsetWidth;
    slideW = wrapperW / visible;

    slides.forEach(sl => sl.style.width = Math.round(slideW)+'px');

    const maxIndex = Math.max(0, slides.length - visible);
    if (index > maxIndex) index = maxIndex;
    if (index < 0) index = 0;

    track.style.transition = 'transform 0.4s ease';
    track.style.transform = `translateX(${-index * slideW}px)`;
    renderDots();
  }

  function renderDots(){
    if (!dotsContainer) return;
    dotsContainer.innerHTML = '';
    const total = Math.max(1, slides.length - visible + 1);
    for (let i=0; i<total; i++){
      const dot = document.createElement('div');
      dot.className = 'dot' + (i===index ? ' active' : '');
      dot.addEventListener('click', () => { index = i; layout(); });
      dotsContainer.appendChild(dot);
    }
  }

  // šipky
  
  // kolotoc
// prevBtn.addEventListener('click', ()=>{ index--; if(index<0) index=slides.length-visible; layout(); });
// nextBtn.addEventListener('click', ()=>{ index++; if(index>slides.length-visible) index=0; layout(); });

// bez kolotoce
  
if (prevBtn) prevBtn.addEventListener('click', () => {
  index = Math.max(0, index - 1);
  layout();
});

if (nextBtn) nextBtn.addEventListener('click', () => {
  index = Math.min(slides.length - visible, index + 1);
  layout();
});

  // zabránit nativnímu drag obrázků
  track.querySelectorAll('img').forEach(img => img.setAttribute('draggable', 'false'));

  // --- DRAG / SWIPE ---
  function pointerStart(clientX, pid){
    isDragging = true;
    startX = clientX;
    startTranslate = -index * slideW;
    currentX = startX;
    track.style.transition = 'none';
    track.classList.add('grabbing');
    justDragged = false;
  }
  function pointerMove(clientX){
    if (!isDragging) return;
    currentX = clientX;
    const dx = currentX - startX;
    track.style.transform = `translateX(${ startTranslate + dx }px)`;
  }
  function pointerEnd(){
    if (!isDragging) return;
    isDragging = false;
    track.classList.remove('grabbing');
    track.style.transition = 'transform 0.4s ease';
    const dx = currentX - startX;
    const threshold = Math.max(30, slideW * 0.15);
    if (dx > threshold) index = Math.max(0, index - 1);
    else if (dx < -threshold) index = Math.min(Math.max(0, slides.length - visible), index + 1);
    if (Math.abs(dx) > 5) {
      justDragged = true;
      setTimeout(()=> justDragged = false, 50);
    }
    layout();
  }

  if (window.PointerEvent) {
    wrapper.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (e.target.closest('#prevBtn, #nextBtn, #dots')) return;
      wrapper.setPointerCapture(e.pointerId);
      pointerStart(e.clientX, e.pointerId);
      e.preventDefault();
    });
    wrapper.addEventListener('pointermove', (e) => pointerMove(e.clientX));
    wrapper.addEventListener('pointerup', (e) => { try{wrapper.releasePointerCapture(e.pointerId);}catch(_){} pointerEnd(); });
    wrapper.addEventListener('pointercancel', pointerEnd);
  } else {
    // fallback: touch + mouse
    wrapper.addEventListener('touchstart', (e) => { if(e.touches.length===1) pointerStart(e.touches[0].clientX); }, {passive:true});
    wrapper.addEventListener('touchmove', (e) => { if(e.touches.length===1) pointerMove(e.touches[0].clientX); }, {passive:true});
    wrapper.addEventListener('touchend', pointerEnd);
    wrapper.addEventListener('mousedown', (e) => { if(e.button===0) { pointerStart(e.clientX); e.preventDefault(); }});
    window.addEventListener('mousemove', (e) => pointerMove(e.clientX));
    window.addEventListener('mouseup', pointerEnd);
  }

  // init + resize debounce
  let rt;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(layout, 80); });
  window.addEventListener('load', layout);
  layout();
});