
document.addEventListener('DOMContentLoaded', () => {
  // slider prvky (musí existovat v HTML)
  const wrapper = document.getElementById('galleryWrapper');
  const track = document.getElementById('galleryTrack');
  const slides = track ? Array.from(track.querySelectorAll('.gallery-slide')) : [];
  const prevBtn = document.getElementById('galleryPrev');
  const nextBtn = document.getElementById('galleryNext');
  const dotsContainer = document.getElementById('galleryDots');

  // lightbox prvky (pokud nejsou, budou ignorovány)
  const lightbox = document.getElementById('galleryLightbox');
  const lightboxImg = document.getElementById('galleryLightboxImg');
  const closeLightboxBtn = document.getElementById('galleryClose');
  const lightboxPrev = document.getElementById('galleryPrevBtn'); // volitelné
  const lightboxNext = document.getElementById('galleryNextBtn'); // volitelné
  const captionEl = document.getElementById('galleryCaption');   // volitelné

  if (!wrapper || !track || slides.length === 0) return; // nic nedělej pokud chybí základ

  let index = 0;
  let visible = 2;
  let slideW = 0;

  // drag state
  let isDragging = false;
  let startX = 0;
  let startTranslate = 0;
  let currentX = 0;
  let justDragged = false;

  function calcVisible(){ return window.innerWidth >= 768 ? 2 : 1; }

  function layout() {
    visible = Math.min(calcVisible(), slides.length);
    const wrapperW = wrapper.offsetWidth;
    slideW = wrapperW / visible;

    slides.forEach(sl => sl.style.width = Math.round(slideW) + 'px');

    // omez index
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
      dot.className = 'gallery-dot' + (i===index ? ' active' : '');
      dot.addEventListener('click', () => { index = i; layout(); });
      dotsContainer.appendChild(dot);
    }
  }

  // šipky (pokud existují)
  if (prevBtn) prevBtn.addEventListener('click', () => { index = Math.max(0, index - 1); layout(); });
  if (nextBtn) nextBtn.addEventListener('click', () => { index = Math.min(Math.max(0, slides.length - visible), index + 1); layout(); });

  // zabraň natívnímu drag obrázků
  track.querySelectorAll('img').forEach(img => img.setAttribute('draggable', 'false'));

  // LIGHTBOX: jednoduché otevření / zavření / posun
  const zoomables = Array.from(document.querySelectorAll('.gallery-zoomable'));
  function openLightbox(i){
    if (!lightbox || !lightboxImg) return;
    const img = zoomables[i];
    if(!img) return;
    lightboxImg.src = img.src;
    if (captionEl) captionEl.textContent = img.alt || '';
    lightbox.classList.remove('d-none');
    // zpoždění, aby CSS transition fungoval
    requestAnimationFrame(()=> lightbox.classList.add('show'));
    currentLightIndex = i;
  }
  function closeLightbox(){
    if (!lightbox) return;
    lightbox.classList.remove('show');
    setTimeout(()=> { lightbox.classList.add('d-none'); }, 360);
  }
  // pokud jsou zoomable obrázky, přidej listener (ignoruj click pokud se právě táhlo)
  if (zoomables.length){
    zoomables.forEach((img, i) => {
      img.addEventListener('click', (e) => {
        if (justDragged) { e.stopImmediatePropagation(); return; }
        openLightbox(i);
      });
    });
  }
  if (closeLightboxBtn) closeLightboxBtn.addEventListener('click', closeLightbox);
  if (lightbox) {
    lightbox.addEventListener('click', (e) => {
      // zavři i klikem na obrázek samotný (požadavek)
      if (e.target === lightbox || e.target === lightboxImg) closeLightbox();
    });
  }
  // lightbox prev/next (pokud existují)
  let currentLightIndex = 0;
  if (lightboxPrev) lightboxPrev.addEventListener('click', (e)=> { e.stopPropagation(); currentLightIndex = (currentLightIndex-1+zoomables.length)%zoomables.length; openLightbox(currentLightIndex); });
  if (lightboxNext) lightboxNext.addEventListener('click', (e)=> { e.stopPropagation(); currentLightIndex = (currentLightIndex+1)%zoomables.length; openLightbox(currentLightIndex); });

  // klávesy pro lightbox: Esc, šipky
  document.addEventListener('keydown', (e) => {
    if (!lightbox || !lightbox.classList.contains('show')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft' && zoomables.length) { currentLightIndex = (currentLightIndex-1+zoomables.length)%zoomables.length; openLightbox(currentLightIndex); }
    if (e.key === 'ArrowRight' && zoomables.length) { currentLightIndex = (currentLightIndex+1)%zoomables.length; openLightbox(currentLightIndex); }
  });

  // DRAG / SWIPE: jednoduché a odolné, používáme PointerEvents (pokryje myš i touch)
  // fallback: pokud pointer event není dostupný, použijeme touch/mouse (nižší kódová složitost)
  function pointerStart(clientX, pointerId){
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
      // tlačítka (např. pokud uživatel klikl na šipky), nechtěné chování - ignoruj, pokud pointer není na track
      // zajistíme, že target není nějaké ovládací tlačítko
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      // pokud kliknutí cíleně na ovládací prvek, ignorujeme drag
      if (e.target.closest('#galleryPrev, #galleryNext, #galleryDots, #galleryClose, #galleryPrevBtn, #galleryNextBtn')) return;
      wrapper.setPointerCapture(e.pointerId);
      pointerStart(e.clientX, e.pointerId);
      e.preventDefault();
    });

    wrapper.addEventListener('pointermove', (e) => {
      pointerMove(e.clientX);
    });

    wrapper.addEventListener('pointerup', (e) => {
      try { wrapper.releasePointerCapture(e.pointerId); } catch(_) {}
      pointerEnd();
    });
    wrapper.addEventListener('pointercancel', pointerEnd);
  } else {
    // fallback: touch + mouse
    wrapper.addEventListener('touchstart', (e) => {
      if (e.touches.length > 1) return;
      pointerStart(e.touches[0].clientX);
    }, { passive: true });
    wrapper.addEventListener('touchmove', (e) => {
      if (e.touches.length > 1) return;
      pointerMove(e.touches[0].clientX);
    }, { passive: true });
    wrapper.addEventListener('touchend', pointerEnd);

    // mouse fallback
    wrapper.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      pointerStart(e.clientX);
      e.preventDefault();
    });
    window.addEventListener('mousemove', (e) => pointerMove(e.clientX));
    window.addEventListener('mouseup', pointerEnd);
  }

  // debounce resize a init
  let rt;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(layout, 80); });
  window.addEventListener('load', layout);
  layout();
});

