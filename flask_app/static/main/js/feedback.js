document.addEventListener("DOMContentLoaded", function() {
    const feedbackButton = document.getElementById("feedback");
    const feedbackFormContainer = document.querySelector(".feedback-form-container");
    const closeButton = document.getElementById("closeFeedback");
    const submitButton = document.getElementById("submitFeedback");
    const feedbackForm = document.getElementById("feedback-form");
    const viewButton = document.getElementById("viewFeedback")

    feedbackFormContainer.style.display = "none";
    feedbackForm.reset();

    feedbackButton.addEventListener("click", function () {
        feedbackFormContainer.style.display = "flex";
    });
    closeButton.addEventListener("click", function () {
        feedbackForm.reset();
        feedbackFormContainer.style.display = "none";
    });


    submitButton.addEventListener("click", function (event) {
        event.preventDefault();

        const formData = new FormData(feedbackForm);

        fetch(feedbackForm.action, {
            method: "POST",
            body: formData
        })
        .then(response => { return response.json(); })
        .then(data => {
            alert(data.message);
            feedbackForm.reset();
            feedbackFormContainer.style.display = "none";
        })
        .catch(error => {
            console.error("Error:", error);
            alert("Failed to submit feedback. Please try again.");
        });
    });
});