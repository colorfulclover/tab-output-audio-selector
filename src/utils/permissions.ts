document.getElementById('grant')?.addEventListener('click', async () => {
  try {
    await navigator.mediaDevices.getUserMedia({ audio: true });
    // Permission granted
    const p = document.createElement('p');
    p.textContent = 'Permission granted! You can close this tab.';
    p.style.color = 'green';
    document.querySelector('.card')?.appendChild(p);
    
    // Auto close after 2 seconds
    setTimeout(() => {
      window.close();
    }, 2000);
    
  } catch (e) {
    console.error('Permission denied', e);
    alert('Permission denied. Please try again.');
  }
});

