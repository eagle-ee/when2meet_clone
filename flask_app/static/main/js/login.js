document.addEventListener('DOMContentLoaded', function() {
    let count = 0;
    const attemptCounter = document.getElementById('attempt-counter');
    const loginButton = document.getElementById('loginButton');
    const ownerLoginButton = document.getElementById('ownerLoginButton');
    const signupButton = document.getElementById('signupButton');

    ///
    ///Button Handlers
    ///
    ownerLoginButton.addEventListener('click', function() {
        checkCredentials();
    });

    loginButton.addEventListener('click', function() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        authenticateUser(email, password);
    });

    signupButton.addEventListener('click', function (){
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        createUser(email, password);
    })



    ///
    ///Credential Check
    ///
    function checkCredentials() {
        // package data in a JSON object
        var data_d = {'email': 'owner@email.com', 'new':'false', 'password': 'password'}
        console.log('data_d', data_d)

        // SEND DATA TO SERVER VIA jQuery.ajax({})
        jQuery.ajax({
            url: "/processlogin",
            data: data_d,
            type: "POST",
            success: function(returned_data) {
                try {
                    var response = JSON.parse(returned_data);
                    if (response.success) {
                        window.location.href = "/home";
                    } else {
                        count++;
                        updateAttemptCounter(response.message || "Login failed");
                    }
                } catch (e) {
                    count++;
                    updateAttemptCounter("Invalid server response");
                }
            },
            error: function(xhr, status, error) {
                count++;
                updateAttemptCounter("Server error: " + (error || "Unknown error"));
            }
        });
    }

    function authenticateUser(email, password){
        var data_d = {'email': email, 'password': password, 'new': 'false'}
        console.log(data_d)

        jQuery.ajax({
            url: "/processlogin",
            data: data_d,
            type: "POST",
            success: function(returned_data) {
                try {
                    var response = JSON.parse(returned_data);
                    if (response.success) {
                        window.location.href = "/home";
                    } else {
                        count++;
                        updateAttemptCounter(response.message || "Login failed");
                    }
                } catch (e) {
                    count++;
                    updateAttemptCounter("Invalid server response");
                }
            },
            error: function(xhr, status, error) {
                count++;
                updateAttemptCounter("Server error: " + (error || "Unknown error"));
            }
        });
    }

    function createUser(email, password){
        var data_d = {'email': email, 'password': password, 'new': 'true'}
        console.log(data_d)
        
        jQuery.ajax({
            url: "/processlogin",
            data: data_d,
            type: "POST",
            success: function(returned_data) {
                try {
                    var response = JSON.parse(returned_data);
                    if (response.success) {
                        window.location.href = "/home";
                    } else {
                        count++;
                        updateAttemptCounter(response.message || "Login failed");
                    }
                } catch (e) {
                    count++;
                    updateAttemptCounter("Invalid server response");
                }
            },
            error: function(xhr, status, error) {
                count++;
                updateAttemptCounter("Server error: " + (error || "Unknown error"));
            }
        });
    }


    function updateAttemptCounter(msg){
        if(count > 0){
            attemptCounter.style.display = 'flex';
            attemptCounter.textContent = `Failed login attempts: ${count}, ${msg}`;
            attemptCounter.style.color = 'red';
        }
    }

});