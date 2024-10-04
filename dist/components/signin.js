document.addEventListener('DOMContentLoaded', () => {
  const signInForm = document.getElementById('sign-in-form');

  signInForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
      const response = await fetch('/api/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include' // This is important for including cookies
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      // Display success message
      alert(data.message); // This will show "Login successful"

      // Store minimal user data in sessionStorage
      sessionStorage.setItem('user', JSON.stringify({
        id: data.id,
        email: data.email
      }));

      // Redirect to the main page
      window.location.href = '/';
    } catch (error) {
      console.error('Sign in error:', error);
      alert(error.message || 'Failed to sign in. Please try again.');
    }
  });
});
