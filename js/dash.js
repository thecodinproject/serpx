(window.browser && browser.runtime) ? extension=browser: extension=chrome

// const site="https://serpaid.com/"
const site="http://localhost:4000/"

let refreshInterval;let paused=false
//// UPDATES background see this as current order tab or close it if one open already, or logout if notsignedin
extension.tabs.getCurrent(function(tab) {
    let dashId=tab.id
    extension.runtime.sendMessage({ 
        message: 'dashTab', 
        payload: { dashId }
    },
    function (response) {
        // console.log("receivedResponse")
        if (response){
            if (response.message === 'go') {
                refreshInterval = setInterval(refreshUpdate, 1000);
                loadOrders(true);

                // Check for the fcmToken
                if (response.fcmToken) {
                    // console.log("FCM Token:", response.fcmToken);
                    // document.getElementById("fcm").innerText=response.fcmToken
                    // Do something with the fcmToken if needed
                }
            }
            //SHOWS ORDER IN PROGRESS INSTEAD OF LOADING ORDERS
            else if (response.message === 'dest') {
                document.getElementById("overlay").style.display = "flex";
            }
        }
        else {
            // notLoggedIn();
            // console.log("loggedin?",response);
            notLoggedIn()
        }
    })
});


const ding = new Audio('/n.mp3');
let container = document.getElementById("container");
let messages=document.getElementById("messages")
// let ipText=document.getElementById("ipText")
const ipMessage="Sorry, your ip address is detected as a VPN/Proxy. Please log out/log back in to retry. If you beleive this is a mistake, please contact us."

extension.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    // console.log("Message from background script:", request.message);
    if (request.message === 'complete'){
        timer=30
        refreshUpdate()
        clearInterval(refreshInterval)
        refreshInterval=setInterval(refreshUpdate,1000)
        document.getElementById("overlay").style.display = "none";
        container.innerText="Task Successful! Wait 30 seconds before starting another order."
    } 
    else if (request.message === 'waiting'){
        document.getElementById("progress").style.display = "none";
        document.getElementById("validate").style.display = "block";
    }
    else if (request.message === 'expired'){
        msgRefresh()
        messages.textContent ="Sorry, task has expired."
    }
    else if (request.message === 'badip'){
        document.getElementById("overlay").style.display = "none";
        messages.textContent =ipMessage;
    }
    else if (request.message === 'country'){
        msgRefresh()
        messages.textContent ="Sorry, it seems your location doesn't match the order. If you beleive this is a mistake, please contact us."
    }
    else if (request.message === 'issue'){
        msgRefresh()
        messages.textContent ="Sorry, there was an error. Try again or contact us if you continue to have issues."
    }
    else if (request.message === 'mismatch'){
        msgRefresh()
        messages.textContent ="Sorry, it seems the incorrect webpage was opened. If you beleive this is a mistake, please contact us."
    }
    else if (request.message === 'closedTab'){
        msgRefresh()
        messages.textContent ="The webpage was closed early! Try again or contact us if you continue to have issues."
    }
    else if (request.message === 'starting'){
        document.getElementById("overlay").style.display = "flex";
        document.getElementById("progress").style.display = "block";
        document.getElementById("validate").style.display = "none";
    }
});


function msgRefresh(){
        loadOrders()
        timer=120
        refreshUpdate()
        clearInterval(refreshInterval)
        refreshInterval=setInterval(refreshUpdate,1000)
        document.getElementById("overlay").style.display = "none";
}

function pauseTimer(){
    timer=90
    refreshUpdate()
    clearInterval(refreshInterval)
}


let orders = new Set(); // Set to store order IDs=
let removeBtn=document.getElementById("removeBtn");
let notifBtn=document.getElementById("notifBtn");
let notif, taskRow

getData('notificationsEnabled').then((data) => {
    if (data) {
        notif = data.notificationsEnabled !== undefined ? data.notificationsEnabled : true;
    } else {
        // console.log("NONOTIFINFO")
        notif = true;
    }
    // console.log('notif is:', notif);
    setData('notificationsEnabled', { notificationsEnabled: notif }); 
    checkNotif();
    notifBtn.addEventListener('click', toggleNotif);
});


removeBtn.addEventListener('click', async () => {
    if (taskRow) {
        const confirmed = confirm("Are you sure you want to remove this order?");
        if (!confirmed){return}
        const task_id = parseInt(taskRow.getAttribute("task_id"));
        const response = await fetch(site + "remove", {
            method: "POST",
            mode: "cors",
            credentials: "same-origin",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                "task_id": task_id
            })
        });
        if (response.ok) {
            const res = await response.json().catch((error) => {
                console.error("Error parsing JSON", error);
            });

            // Check if response has message property
            if (res && res.message === 'complete') {
                // Task is complete, remove taskRow
                taskRow.remove();
                removeBtn.disabled = true; removeBtn.style.backgroundColor = "lightgray";
            }
        } else if (response.status === 404) {
            // Order not found, handle accordingly
            taskRow.remove(); // Remove taskRow if desired
            messages.textContent = "Order not found";
            removeBtn.disabled = true; removeBtn.style.backgroundColor = "lightgray";
        } else if (response.status === 500) {
            // Internal server error
            messages.textContent = "Issue connecting to server";
        } else {
            // Handle other response statuses if needed
            messages.textContent="Unexpected response, check console log"
            console.error("Unexpected response status:", response.status);
        }
        refreshInterval=setInterval(refreshUpdate,1000)
    }
});

// let ip
//Connnects to DB and checks for orders, then loops and makes a table row for each. CHANGE TO ONLY SHOW ORDER ID
const loadOrders = async function (start=false) {
    removeBtn.disabled = true; removeBtn.style.backgroundColor = "lightgray"; taskRow=null;
    container.innerHTML = ""; messages.textContent=""
    let res, accessCount
    try {
        const data = await getData('myExpireData', true);
        if (data) {
            accessCount = 1;
        } else {
            accessCount = 10;
            setData('myExpireData', { expire: 'expire data' }, 30);///// SET TIME TO CHECK
        }
        // getData('check').then((data) => {
        //     if (data) {
        //     } else {
                
        //         setDataWithExpiration('check', { }, 1);
        //     }
        // });
        
        // const response = await fetch(site + "tasks");
        // console.log("start",start)
        const response = await fetch(`${site}get-tasks?accessCount=${accessCount}&start=${start}`);
        res = await response.json();
        // Process response data here
        // ip=res.ip
        // console.log(ip)
        if (res.message=='badip'){
            refresh.innerText='';
            document.getElementById("overlay").style.display = "none";
            // ipText.textContent="IP: BAD"
            messages.textContent =ipMessage;
            clearInterval(refreshInterval)
            return
        }
        else if (res.message=='weight'){
            refresh.innerText="PAUSED due to inactivity; refresh to unpause."
            paused=true
            clearInterval(refreshInterval)
        }
        res=res.results
        // try {
        //     const ipInfo = await checkIP();
        //     console.log("ipInfo",ipInfo);
        //     if (ipInfo.proxy || ipInfo.hosting){
        //         //ipText.textContent="IP: BAD"
        //         container.innerText = "Sorry, your IP address is seen as proxy/vpn. Please contact us if you believe this is in error.";
        //         return
        //     }
        // } catch (error) {
        //     console.error("Error fetching IP information:", error);
        //     messages.textContent = "Error fetching IP information:", error;
        //     return
        // }

    } catch (error) {
        console.error(error);
        messages.textContent = "Issue connecting to server"; // Update messages element
    }
    if (res === undefined) {
        notLoggedIn();
        // console.log("res Undefined")
        // container.innerText="No Orders Available!"
        // orders.clear();
    } else if (!res.length) {
        container.innerText="No Orders Available!"
        orders.clear();
    } else {
        const newOrders = res.filter(order => !orders.has(order.task_id)); 
        if (newOrders.length > 0) {
            if (notif){
                ding.play();
                extension.notifications.create({
                    type: 'basic',
                    iconUrl: extension.extension.getURL('icons/3-transparent-128.png'), // Replace 'path/to/icon.png' with the actual path to your icon image
                    title: 'New Order!',
                    message: 'You have new orders available.'
            })}
            newOrders.forEach(order => orders.add(order.task_id)); // Add new order IDs to the set
        }

        for (let orderId of orders) {
            if (!res.some(order => order.task_id === orderId)) {
                orders.delete(orderId);
            }
        }

         // Create the table element
         let table = document.createElement("table");
         
         // Get the keys (column names) of the first object in the JSON data
         let cols = Object.keys(res[0]);
         
         // Create the header element
         let thead = document.createElement("thead");
         let tr = document.createElement("tr");
         
         // Loop through the column names and create header cells
         cols.forEach((item) => {
            let th = document.createElement("th");
            th.innerText = item; // Set the column name as the text of the header cell
            tr.appendChild(th); // Append the header cell to the header row
         });
         thead.appendChild(tr); // Append the header row to the header
         table.append(tr) // Append the header to the table
         
         // Loop through the JSON data and create table rows
         res.forEach((item) => {
            let tr = document.createElement("tr");
            
            // Get the values of the current object in the JSON data
            let vals = Object.values(item);
            
            // Loop through the values and create table cells
            vals.forEach((elem) => {
               let td = document.createElement("td");
               if (Array.isArray(elem)){
                elem=elem.join(',')
                // console.log(elem)
                if (elem==''){elem="ANY"}
               }
               td.setAttribute('tabindex', '0')
               td.innerText = elem; // Set the value as the text of the table cell
               tr.appendChild(td); // Append the table cell to the table row
            });
            
            ///CREATES A BUTTON, temprorary *****
            let btn=document.createElement("button");
            btn.id=item.order_id;//sets button id as order_id
            btn.textContent="Start";
            btn.addEventListener('click',() => {// add listener to btn
                createTab(item.task_id,btn)
            });
            tr.setAttribute("task_id", item.task_id);
            tr.appendChild(btn)

            table.appendChild(tr); // Append the table row to the table
         });
         container.appendChild(table) // Append the table to the container element
        }
    }  

//ORDERS buttons interaction

const hcaptcha_widget=document.getElementById("hcaptcha")
let hData


const createTab = async function (task_id, btn) {
    messages.textContent=""
    hData=hcaptcha_widget.getElementsByTagName("iframe")[0].getAttribute('data-hcaptcha-response')
    const response = await fetch(site+"start", {
        method: "POST", 
        mode: "cors",
        credentials: "same-origin",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            "task_id": task_id,
            "hcaptcha": hData
        })
    });
    const res = await response.json().catch((error) => {/////////Need to react to order not available by SAYING it is no longer available.
        console.error("Error");
        messages.textContent="Issue connecting to server. Please try again."
      });
    if (res.message){
        if (res.message== "hcaptchaFail"){
            messages.textContent="Complete hCaptcha First!"; return
        }
        else if (res.message== "Order not found"){
            btn.textContent="Order no longer available!"
            if (paused){
                setTimeout(() => window.location.reload(), 3000);
            }
            return btn.disabled=true;
        }
        else if (res.message=="wait"){
            wait=res.wait
            timer=wait
            refresh.innerText="Refresh: "+timer
            messages.textContent=`Please wait ${wait} seconds!`; return
        }
    }
    hcaptcha.reset()
    let order=res
    let seconds = 10//Math.floor(Math.random() * (140 - 60 + 1)) + 60;
    order.seconds=seconds;
    
    if (order.engine=="google") {if (!order.gstart) {order.gstart="https://www.google.com/"}; newUrl=order.gstart
    } else if (order.engine=="duck") {newUrl="http://www.duckduckgo.com/"
    } else if (order.engine=="maps") {newUrl="https://www.google.com/maps"
    } else if (order.engine=="bing") {newUrl="https://www.bing.com/"
    } else if (order.engine=="youtube") {newUrl="https://www.youtube.com/"
    } else if (order.engine=="yahoo") {newUrl="https://www.yahoo.com/"
    } else if (order.engine=="ebay") {newUrl="https://www.ebay.com/"
    } else if (order.engine=="etsy") {newUrl="https://www.etsy.com/"
    } else if (order.engine=="amazon") {newUrl="https://www.amazon.com/"
    } else if (order.engine=="direct") {newUrl=order.url}

    if (order.url.includes('/place/') || (order.engine=="youtube")) {order.exact=false}//place & youtube can't be exact
    // console.log(`Created new tab: ${tab.id}`);
    order["task_id"]=task_id
    extension.runtime.sendMessage({ 
        message: 'newOrder', 
        payload: { order, newUrl}
    },function (response) {
            //get reponse from background, if didn't receive, close
    })
    pauseTimer();


    let rows = document.querySelectorAll('tr');
    rows.forEach(function(row) {row.style = '';});
    btn.parentElement.style.border = '2px solid red';
    taskRow=btn.parentElement;
    removeBtn.disabled = false; removeBtn.style.backgroundColor = "red";
}


function notLoggedIn(){
    document.getElementById("loggedIn").innerText="You are not logged in";
    document.getElementById("logout").style.display="none";
    setTimeout(logout,1000)
}

//LOGOUT
document.querySelector('#logout').addEventListener('click', () => {
        logout();
});
///add enter btn listener??

function logout(){
    extension.runtime.sendMessage({ message: 'logout' },
            function (response) {
                // console.log(response)
                if (response === 'success'){
                    extension.tabs.getCurrent(function(tab) {
                        extension.tabs.remove(tab.id, function() { });
                    });

                }
                else {
                    
                }
                   
            })
}

//OrderComplete



//AutoReload
const refresh=document.getElementById("refresh");
let refreshTime=120
let timer=refreshTime
refresh.innerText="Refresh: "+timer

function refreshUpdate(){
    return
    if (timer<=0){
        timer=refreshTime+1
        loadOrders()
    }
    timer-=1;
    refresh.innerText="Refresh: "+timer
}

// Enable/Disable Notifications
function toggleNotif(){
    notif=!notif;
    checkNotif();
    // extension.storage.local.set({ notificationsEnabled: notif })
    setData('notificationsEnabled', { notificationsEnabled: notif }); // Set data without expiration
    // console.log(notif)
}
function checkNotif(){
    if (notif){
        notifBtn.style.background=''
        notifBtn.style.textDecoration='';
    }
    else{
        notifBtn.style.background='grey'
        notifBtn.style.textDecoration='line-through';
    }
}


// Function to set data to Chrome Extension Storage
function setData(key, value, expirationMinutes = null) {
    if (expirationMinutes) {
        const expirationTime = new Date().getTime() + (expirationMinutes * 60 * 1000);
        value = { value: value, expiration: expirationTime };
    }
    // console.log("trying to set:", key, value, expirationMinutes)
    extension.storage.local.set({ [key]: value });
}

// Function to get data from Chrome Extension Storage
function getData(key, checkExpiration = false) {
    return new Promise((resolve) => {
        extension.storage.local.get(key, (result) => {
            const data = result[key];
            if (!data) {
                // console.log(key, "data doesn't exist")
                resolve(null); // Data doesn't exist
            } else if (checkExpiration && data.expiration && data.expiration < new Date().getTime()) {
                // console.log(key, data, "data has expired")
                extension.storage.local.remove(key); // Data has expired, remove it
                resolve(null);
            } else {
                // console.log("got data!", data)
                resolve(data); // Return the value
            }
        });
    });
}