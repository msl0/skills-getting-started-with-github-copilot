document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Generate participants list HTML
        const participantsList = details.participants.length > 0
          ? `<ul class="participants-list">${details.participants.map(email => 
              `<li class="participant-item">
                <span class="participant-email">${email}</span>
                <button class="delete-participant" onclick="unregisterParticipant('${name}', '${email}')" title="Unregister participant">✕</button>
              </li>`
            ).join('')}</ul>`
          : '<p class="no-participants">No participants yet</p>';

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p><strong>Availability:</strong> ${spotsLeft} spots left</p>
          <div class="participants-section">
            <h5>Participants:</h5>
            ${participantsList}
          </div>
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        
        // Refresh the activities list to show the new participant
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Function to unregister a participant
  window.unregisterParticipant = async function(activityName, email) {
  try {
    console.log('Unregistering:', activityName, email); // Debug log
    const url = `/activities/${encodeURIComponent(activityName)}/unregister?email=${encodeURIComponent(email)}`;
    console.log('Request URL:', url); // Debug log
    
    const response = await fetch(url, {
      method: "DELETE",
    });

    console.log('Response status:', response.status); // Debug log
    
    // Check if response has content before parsing JSON
    let result;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      result = await response.json();
    } else {
      const text = await response.text();
      console.log('Response text:', text);
      result = { detail: text || 'Unknown error' };
    }

    const messageDiv = document.getElementById("message");

    if (response.ok) {
      messageDiv.textContent = result.message || 'Participant unregistered successfully';
      messageDiv.className = "success";
      
      // Refresh the activities list to show updated participant count
      await fetchActivities();
    } else {
      messageDiv.textContent = result.detail || `Error ${response.status}: ${response.statusText}`;
      messageDiv.className = "error";
      console.error('Server error:', result);
    }

    messageDiv.classList.remove("hidden");

    // Hide message after 5 seconds
    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  } catch (error) {
    const messageDiv = document.getElementById("message");
    messageDiv.textContent = `Network error: ${error.message}`;
    messageDiv.className = "error";
    messageDiv.classList.remove("hidden");
    console.error("Error unregistering participant:", error);
  }
  };

  // Initialize app
  fetchActivities();
});
