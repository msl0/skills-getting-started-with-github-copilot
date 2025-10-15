import pytest
from fastapi.testclient import TestClient
from src.app import app, activities


@pytest.fixture
def client():
    """Create a test client for the FastAPI application."""
    return TestClient(app)


@pytest.fixture
def reset_activities():
    """Reset activities data before each test."""
    # Store original activities
    original_activities = {}
    for name, details in activities.items():
        original_activities[name] = {
            "description": details["description"],
            "schedule": details["schedule"],
            "max_participants": details["max_participants"],
            "participants": details["participants"].copy()
        }
    
    yield
    
    # Restore original activities after test
    activities.clear()
    activities.update(original_activities)


class TestRootEndpoint:
    """Test the root endpoint."""
    
    def test_root_redirects_to_static_html(self, client):
        """Test that root endpoint redirects to static HTML."""
        response = client.get("/", follow_redirects=False)
        assert response.status_code == 307
        assert response.headers["location"] == "/static/index.html"


class TestActivitiesEndpoint:
    """Test the activities endpoint."""
    
    def test_get_activities_returns_all_activities(self, client, reset_activities):
        """Test that GET /activities returns all activities."""
        response = client.get("/activities")
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, dict)
        
        # Check that we have some activities
        assert len(data) > 0
        
        # Check structure of first activity
        activity_name = list(data.keys())[0]
        activity = data[activity_name]
        
        required_keys = ["description", "schedule", "max_participants", "participants"]
        for key in required_keys:
            assert key in activity
        
        assert isinstance(activity["participants"], list)
        assert isinstance(activity["max_participants"], int)


class TestSignupEndpoint:
    """Test the signup endpoint."""
    
    def test_signup_for_existing_activity_success(self, client, reset_activities):
        """Test successful signup for an existing activity."""
        activity_name = "Chess Club"
        email = "test@mergington.edu"
        
        response = client.post(f"/activities/{activity_name}/signup?email={email}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["message"] == f"Signed up {email} for {activity_name}"
        
        # Verify the participant was added
        activities_response = client.get("/activities")
        activities_data = activities_response.json()
        assert email in activities_data[activity_name]["participants"]
    
    def test_signup_for_nonexistent_activity_fails(self, client, reset_activities):
        """Test signup for non-existent activity returns 404."""
        activity_name = "Nonexistent Activity"
        email = "test@mergington.edu"
        
        response = client.post(f"/activities/{activity_name}/signup?email={email}")
        assert response.status_code == 404
        assert "Activity not found" in response.json()["detail"]
    
    def test_duplicate_signup_fails(self, client, reset_activities):
        """Test that duplicate signup for same activity fails."""
        activity_name = "Chess Club"
        email = "test@mergington.edu"
        
        # First signup should succeed
        response1 = client.post(f"/activities/{activity_name}/signup?email={email}")
        assert response1.status_code == 200
        
        # Second signup should fail
        response2 = client.post(f"/activities/{activity_name}/signup?email={email}")
        assert response2.status_code == 400
        assert "already signed up" in response2.json()["detail"]
    
    def test_signup_with_encoded_activity_name(self, client, reset_activities):
        """Test signup works with URL-encoded activity names."""
        activity_name = "Programming Class"
        email = "test@mergington.edu"
        
        # URL encode the activity name
        encoded_name = activity_name.replace(" ", "%20")
        
        response = client.post(f"/activities/{encoded_name}/signup?email={email}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["message"] == f"Signed up {email} for {activity_name}"


class TestUnregisterEndpoint:
    """Test the unregister endpoint."""
    
    def test_unregister_existing_participant_success(self, client, reset_activities):
        """Test successful unregistration of an existing participant."""
        activity_name = "Chess Club"
        email = "test@mergington.edu"
        
        # First sign up
        signup_response = client.post(f"/activities/{activity_name}/signup?email={email}")
        assert signup_response.status_code == 200
        
        # Then unregister
        response = client.delete(f"/activities/{activity_name}/unregister?email={email}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["message"] == f"Unregistered {email} from {activity_name}"
        
        # Verify the participant was removed
        activities_response = client.get("/activities")
        activities_data = activities_response.json()
        assert email not in activities_data[activity_name]["participants"]
    
    def test_unregister_from_nonexistent_activity_fails(self, client, reset_activities):
        """Test unregister from non-existent activity returns 404."""
        activity_name = "Nonexistent Activity"
        email = "test@mergington.edu"
        
        response = client.delete(f"/activities/{activity_name}/unregister?email={email}")
        assert response.status_code == 404
        assert "Activity not found" in response.json()["detail"]
    
    def test_unregister_non_registered_participant_fails(self, client, reset_activities):
        """Test unregister of non-registered participant fails."""
        activity_name = "Chess Club"
        email = "notregistered@mergington.edu"
        
        response = client.delete(f"/activities/{activity_name}/unregister?email={email}")
        assert response.status_code == 400
        assert "not registered" in response.json()["detail"]
    
    def test_unregister_with_encoded_activity_name(self, client, reset_activities):
        """Test unregister works with URL-encoded activity names."""
        activity_name = "Programming Class"
        email = "test@mergington.edu"
        
        # First sign up
        signup_response = client.post(f"/activities/{activity_name}/signup?email={email}")
        assert signup_response.status_code == 200
        
        # URL encode the activity name for unregister
        encoded_name = activity_name.replace(" ", "%20")
        
        response = client.delete(f"/activities/{encoded_name}/unregister?email={email}")
        assert response.status_code == 200
        
        data = response.json()
        assert data["message"] == f"Unregistered {email} from {activity_name}"


class TestIntegrationWorkflows:
    """Test complete workflows combining multiple endpoints."""
    
    def test_complete_signup_unregister_workflow(self, client, reset_activities):
        """Test complete workflow: signup -> verify -> unregister -> verify."""
        activity_name = "Chess Club"
        email = "workflow@mergington.edu"
        
        # Get initial participant count
        initial_response = client.get("/activities")
        initial_participants = initial_response.json()[activity_name]["participants"]
        initial_count = len(initial_participants)
        
        # Sign up
        signup_response = client.post(f"/activities/{activity_name}/signup?email={email}")
        assert signup_response.status_code == 200
        
        # Verify signup
        after_signup = client.get("/activities")
        after_signup_participants = after_signup.json()[activity_name]["participants"]
        assert len(after_signup_participants) == initial_count + 1
        assert email in after_signup_participants
        
        # Unregister
        unregister_response = client.delete(f"/activities/{activity_name}/unregister?email={email}")
        assert unregister_response.status_code == 200
        
        # Verify unregistration
        after_unregister = client.get("/activities")
        after_unregister_participants = after_unregister.json()[activity_name]["participants"]
        assert len(after_unregister_participants) == initial_count
        assert email not in after_unregister_participants
    
    def test_multiple_participants_same_activity(self, client, reset_activities):
        """Test multiple participants can join the same activity."""
        activity_name = "Chess Club"
        emails = ["user1@mergington.edu", "user2@mergington.edu", "user3@mergington.edu"]
        
        # Sign up multiple participants
        for email in emails:
            response = client.post(f"/activities/{activity_name}/signup?email={email}")
            assert response.status_code == 200
        
        # Verify all participants are registered
        activities_response = client.get("/activities")
        participants = activities_response.json()[activity_name]["participants"]
        for email in emails:
            assert email in participants
        
        # Unregister one participant
        response = client.delete(f"/activities/{activity_name}/unregister?email={emails[1]}")
        assert response.status_code == 200
        
        # Verify only the targeted participant was removed
        activities_response = client.get("/activities")
        participants = activities_response.json()[activity_name]["participants"]
        assert emails[0] in participants
        assert emails[1] not in participants
        assert emails[2] in participants