document.getElementById('role').addEventListener('change', function () {
  const role = this.value;
  document.getElementById('ngoFields').style.display = role === 'ngo' ? 'block' : 'none';
  document.getElementById('volunteerFields').style.display = role === 'volunteer' ? 'block' : 'none';
});

document.getElementById('registrationForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const formData = {
    role: document.getElementById('role').value,
    fullName: document.getElementById('fullName').value,
    email: document.getElementById('email').value,
    phoneNumber: document.getElementById('phoneNumber').value,
    password: document.getElementById('password').value,
    confirmPassword: document.getElementById('confirmPassword').value,
    location: document.getElementById('location').value,
    organizationName: document.getElementById('organizationName').value,
    ngoDescription: document.getElementById('ngoDescription').value,
    registrationNumber: document.getElementById('registrationNumber').value,
    skills: document.getElementById('skills').value,
    availability: document.getElementById('availability').value,
  };

  if (formData.password !== formData.confirmPassword) {
    alert('Passwords do not match!');
    return;
  }

  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });
    const result = await response.json();
    alert(result.message || 'Registration successful!');
  } catch (error) {
    alert('Registration failed. Please try again.');
  }
});