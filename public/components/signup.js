document.addEventListener('DOMContentLoaded', () => {
  const signUpForm = document.getElementById('sign-up-form');

  signUpForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    // Client-side validation
    if (!email || !password || !confirmPassword) {
      alert("Email and password are required.");
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      alert("Please enter a valid email address.");
      return;
    }

    if (password !== confirmPassword) {
      alert("Passwords don't match. Please try again.");
      return;
    }

    if (password.length < 8) {
      alert("Password must be at least 8 characters long.");
      return;
    }

    try {
      const response = await fetch('/api/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Signup failed');
      }

      // Display success message
      alert(data.message);

      // Store minimal user data in sessionStorage
      sessionStorage.setItem('user', JSON.stringify({
        id: data.id,
        email: data.email
      }));

      // Redirect to home page
      window.location.href = '/';
    } catch (error) {
      console.error('Sign up error:', error);
      alert(error.message || 'Failed to sign up. Please try again.');
    }
  });
});
