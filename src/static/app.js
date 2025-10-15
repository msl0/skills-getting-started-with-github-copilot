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

        // Build participants list DOM
        let participantsSection = document.createElement("div");
        participantsSection.className = "participants-section";
        const participantsHeader = document.createElement("h5");
        participantsHeader.textContent = "Participants:";
        participantsSection.appendChild(participantsHeader);

        if (details.participants.length > 0) {
          const ul = document.createElement("ul");
          ul.className = "participants-list";
          details.participants.forEach(email => {
            const li = document.createElement("li");
            li.className = "participant-item";

            const emailSpan = document.createElement("span");
            emailSpan.className = "participant-email";
            emailSpan.textContent = email;
            li.appendChild(emailSpan);

            const deleteBtn = document.createElement("button");
            deleteBtn.className = "delete-participant";
            deleteBtn.title = "Unregister participant";
            deleteBtn.textContent = "✕";
            deleteBtn.addEventListener("click", () => {
              unregisterParticipant(name, email);
            });
            li.appendChild(deleteBtn);

            ul.appendChild(li);
          });
          participantsSection.appendChild(ul);
        } else {
          const noParticipants = document.createElement("p");
          noParticipants.className = "no-participants";
          noParticipants.textContent = "No participants yet";
          participantsSection.appendChild(noParticipants);
        }

        // Build activity card DOM
        const h4 = document.createElement("h4");
        h4.textContent = name;
        activityCard.appendChild(h4);

        const descP = document.createElement("p");
        descP.textContent = details.description;
        activityCard.appendChild(descP);

        const scheduleP = document.createElement("p");
        const scheduleStrong = document.createElement("strong");
        scheduleStrong.textContent = "Schedule:";
        scheduleP.appendChild(scheduleStrong);
        scheduleP.appendChild(document.createTextNode(" " + details.schedule));
        activityCard.appendChild(scheduleP);

        const availP = document.createElement("p");
        const availStrong = document.createElement("strong");
        availStrong.textContent = "Availability:";
        availP.appendChild(availStrong);
        availP.appendChild(document.createTextNode(` ${spotsLeft} spots left`));
        activityCard.appendChild(availP);

        activityCard.appendChild(participantsSection);
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
    if (window.DEBUG) console.log('Request URL:', url); // Debug log
    
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
