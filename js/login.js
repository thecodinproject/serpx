(window.browser && browser.runtime) ? extension=browser: extension=chrome


const button = document.querySelector('button');
const fail = document.querySelector('#fail')

button.addEventListener('mouseover', () => {
    button.style.transform = 'scale(1.1)';
});

button.addEventListener('mouseleave', () => {
    button.style.transform = 'scale(1)';
});

document.querySelector('form').addEventListener('submit', event => {
    event.preventDefault();
    fail.style.color="grey"
    fail.textContent="Checking..."

    const email = document.querySelector('#email').value;
    const pass = document.querySelector('#password').value;
    
    if (email && pass) {
        // send message to background script with email and password
        extension.runtime.sendMessage({ 
            message: 'login', 
            payload: { email,    pass }
        },
        function (response) {
            
            if (response === 'success'){
                fail.style.color="green"
                fail.textContent="Logged In!"
                extension.tabs.create({
                    url: '../pages/dash.html'
                })
                extension.browserAction.setPopup({
                    popup: ""
                })
                extension.browserAction.setBadgeText( {text: ""});
                window.close();
            }
            else if (response ==='fail'){
                fail.style.color="red";
                fail.textContent="Email or Password Incorrect";
            }
            else {
                fail.style.color="red";
                fail.textContent="Connection Issue!";
            }
        });
    } else {;
        fail.style.color="red"
        fail.textContent="Email or Password Incorrect";
        // document.querySelector('#email').placeholder = "Enter an email.";
        // document.querySelector('#password').placeholder = "Enter a password.";
        // document.querySelector('#email').style.backgroundColor = 'red';
        // document.querySelector('#password').style.backgroundColor = 'red';
        // document.querySelector('#email').classList.add('white_placeholder');
        // document.querySelector('#password').classList.add('white_placeholder');
    }
});