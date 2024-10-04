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
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Signup failed');
      }

      const result = await response.json();
      alert(result.message); // Should show "Signup successful"
      
      // Redirect to the main page
      window.location.href = '/';

    } catch (error) {
      console.error('Sign up error:', error);
      alert(error.message || 'Failed to sign up. Please try again.');
    }
  });
});
