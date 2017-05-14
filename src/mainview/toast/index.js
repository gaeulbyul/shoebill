class Toaster {
  constructor (container) {
    if (!container) {
      throw new Error('please give container element');
    }
    this.container = container;
    this.toasts = {};
  }
  toast (message) {
    const toastID = Date.now() + (Math.random() * 100);
    const toast = this.toasts[toastID] = document.createElement('div');
    toast.classList.add('toast');
    toast.setAttribute('data-toast-id', toastID);
    {
      const text = document.createElement('div');
      text.classList.add('text');
      text.textContent = message;
      toast.appendChild(text);
    }
    {
      const close = document.createElement('div');
      close.classList.add('close');
      close.innerHTML = '<i class="fa fa-times" aria-hidden="true"></i>';
      close.addEventListener('click', event => {
        this.close(toastID);
      });
      toast.appendChild(close);
    }
    this.container.appendChild(toast);
    toast.style.transform = 'translateY(0)';
    window.setTimeout(() => this.close(toastID), 5000);
  }
  close (toastID) {
    const toast = this.toasts[toastID];
    if (!toast) return;
    this.toasts[toastID] = null;
    toast.classList.add('hiding');
    toast.addEventListener('animationend', event => {
      toast.innerHTML = '';
      toast.style.display = 'none';
      toast.remove();
    });
  }
  changeFont (font) {
    this.container.style.fontFamily = font;
  }
}
