(window.browser && browser.runtime) ? extension=browser: extension=chrome

// const site="https://serpaid.com/"
const site="http://localhost:4000/"

let dashTab
, searchTab//have all info of tab, not just ID
, destTab
, orderInfo
, preDest
//buyer_id,: ,"2",clicker_id,: ,"1",cost,: ,true,engine,: ,"duck",order_id,: ,"1",phrase,: ,"reddit",pool_id,: ,1,time,: ,"120",url,: ,"reddit.com"
, canLock
, destTimer
, secondDest,
token
let subTimer=null;
let mapSearched=false
const txt=document.createElement("input"); document.body.appendChild(txt);

preLoginCheck();

extension.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // console.log("MESSAGE RECEIVED:",request.message)
    if (request.message === 'login') {
        flip_user_status(true, request.payload)
            .then(res => {sendResponse(res);console.log(res)})
            .catch(err => console.log(err));        return true;

    } else if (request.message === 'logout') {
        closeTabs()

        flip_user_status(false, null)
            .then(res => sendResponse(res))
            .catch(err => console.log(err));        return true;

    } else if (request.message === 'dashTab') {
        //makes newest Dash page the dashTab; if already a Dashtab, close that one? or allow it to stay open?
        if (dashTab){
            extension.tabs.get(dashTab,callback);////check if tab exists, if not, runtime.lastError will occur
            function callback() {
                if (extension.runtime.lastError) {
                    console.log(extension.runtime.lastError.message);
                    dashTab=request.payload.dashId;
                } else if (dashTab !=request.payload.dashId){
                    extension.tabs.remove(request.payload.dashId);
                    // console.log("Two Dashes", dashTab,request.payload.dashId, dashTab != request.payload.dashId)
                } else {dashTab=request.payload.dashId;}
                
            }
        } else {
            dashTab=request.payload.dashId;
        }

        // if (dashTab && dashTab !=request.payload.dashId){
        //     extension.tabs.remove(request.payload.dashId);
        //     console.log("Two Dashes", dashTab,request.payload.dashId, dashTab != request.payload.dashId)
        // }
        // else {
        //     dashTab=request.payload.dashId;
        // }
        // console.log("new dashTab:", dashTab);
        extension.tabs.update(dashTab,{
            autoDiscardable: false,
            active: true
        })
        is_user_signed_in().then(res => {
            // console.log("loggedin?",res)
            if (destTab){sendResponse({ message: "dest" })}
            else {
                // const fcmToken = localStorage.getItem('fcmToken');
                // console.log(fcmToken)
                const responsePayload = { message: "go" };
                // if (fcmToken) {
                //     responsePayload.fcmToken = fcmToken;
                // }
                if (token) {
                    responsePayload.fcmToken = token;
                }
                sendResponse(responsePayload);
            }

        })
        return true;//////THIS IS NEEDED TO LET message sender know that response is Async.... ???


    } else if (request.message == 'newOrder') {
        closeTabs()
        // console.log("URL IS:",request.payload.newUrl)
        if (request.payload.order.engine=='direct')
        {preDest=true} else {preDest=null}
        destTab=null; mapSearched=null; subTimer=null;
        orderInfo=request.payload.order
        orderInfo.newUrl=request.payload.newUrl
        destTimer=orderInfo.seconds
        if (orderInfo.engine=="youtube"){
            orderInfo.url=orderInfo.url.split('v=').pop().split('&')[0]; 
        }
        extension.tabs.create({
            url: orderInfo.newUrl
        },  function(tab) {
                // console.log(`Created new tab: ${tab.id}`);
                
        
            // console.log("got newOrder! Order:", request.payload.order, "searchTab:", tab)
            searchTab=tab;
            // console.log("order phrase:", orderInfo.phrase)
            copyToClipboard(orderInfo.phrase);
        });
            


        // console.log("got newOrder! Order:", request.payload.order, "searchTab:", request.payload.tab)
        // searchTab=request.payload.tab; orderInfo=request.payload.order;
        // console.log("order phrase:", orderInfo.phrase)
        // copyToClipboard(orderInfo.phrase);
        // destTab==null; preDest=null

        //Website asks to check for if URL is on page. If reply is yes, then it will perform check on checker.js
    // } else if (request.message==='check?') {
    //     (orderInfo && !destTab) ? sendResponse({ 
    //             message: 'yes', 
    //             payload: { orderInfo }
    //     }) : sendResponse({ 
    //         message: 'no', 
    //         payload: { orderInfo }
    // })

    } else if (request.message==='destFound'){
        preDest=true;
        sendResponse( {message:"roger"})
    } else if (request.message==='destLost'){
        preDest=null;
        sendResponse( {message:"roger"})
    } else if (request.message==='missComplete'){
        sendResponse( {message:"tryingtoComplete"})
        tryComplete(request.payload)//payload is href
        
    } else if (request.message==='suburl'){
        sendResponse( {message:"nexturl"})
        subTimer=request.payload//payload is timer
        orderInfo.seconds=subTimer
        extension.tabs.update(destTab, { url: orderInfo.suburl });
    } else if (request.message==="mapSearched"){
        mapSearched=request.payload.mapSearched
        sendResponse( {message:"mapIsSearched"})
        // console.log("mapsearched:",request.payload.mapSearched)
    } else if (request.message==="countdown"){
        destTimer=request.payload
        sendResponse( {message:"countedDown"})
    } else if (request.message==="start?"){
        orderInfo.ref=request.payload
        if (orderInfo && destTab){
            // console.log("STARTING!!")
            extension.runtime.sendMessage({message: 'starting'})
            sendResponse( {message:"start"})
        } else {sendResponse( {message:"no"})}
    }
});

// Create a Broadcast Channel
const channel = new BroadcastChannel('background-messages');

// Listen for messages
channel.onmessage = function(event) {
    is_user_signed_in().then(res => {
        if (!res.userStatus){return}
        console.log('Received message from service worker:', event.data);
        if (event.data.message=="NewDash")
        // Handle the message as needed
        extension.tabs.create({ url: '../pages/dash.html'});
    })
    
};


function closeTabs(){
    if (searchTab){extension.tabs.remove(searchTab.id)}
    if (destTab){extension.tabs.remove(destTab)}
    destTab=null; searchTab=null; preDest=null; mapSearched=null; orderInfo=null; subTimer=null;
}

const tryComplete = async function (tabPayload) {//payload is href
    try {
    if( !orderInfo ) {return closeTabs()}///// MAKE GENERIC ALERT ISSUE ON ORDER PAGE
    let orderInf=orderInfo
    // console.log("Dest and ORder: ",destTab,searchTab, orderInf)
    closeTabs()
    let orderDest
    if ((orderInf.engine=="youtube" && !orderInf.suburl) || (orderInf.suburl && orderInf.suburl.includes("watch?"))){
        orderDest=orderInf.url
        if (orderInf.suburl && orderInf.suburl.includes("watch?v")){
            orderDest = orderInf.suburl.slice(orderInf.suburl.indexOf("v=") + 2, orderInf.suburl.indexOf("&", orderInf.suburl.indexOf("v=")));

        }
        //////////// ADD CHECK FOR engine/SUBURL as ebay,amazon,etsy. they all use item code, url may be different
    }
    else {
        if (orderInf.suburl){orderDest=new URL(orderInf.suburl)}
        else {orderDest=new URL(orderInf.url)}
        if (orderDest.href.includes('/place/')){
            orderDest=orderDest.pathname.split("@")[0]
        } else {
            // orderDest=orderDest.hostname
            orderDest=orderDest.href
        }
    }
    let finalTab=new URL(tabPayload)
    if (finalTab.href.includes('/place/')){
        finalTab=finalTab.pathname.split("@")[0]
    } else {
        // finalTab=finalTab.hostname
        finalTab=finalTab.href
    }
    orderDest=orderDest.replaceAll('/','')
    finalTab=finalTab.replaceAll('/','')
    // console.log(finalTab)
    // console.log(orderDest)
    if (!finalTab.includes(orderDest)){
        extension.runtime.sendMessage({ message: "mismatch"});
        return //console.log("URL's DON'T MATCH")
    }
    // console.log("finaltab=finaldest",(finalTab==orderDest), "finaldest IN finaltab", (orderDest.includes(finalTab)))
    // if (orderInfo.exact){ if (finalTab!==orderDest){return closeTabs()}}///// MAKE GENERIC ALERT ISSUE ON ORDER PAGE
    // else if (!finalTab.includes(orderDest)){return closeTabs()}///// MAKE GENERIC ALERT ISSUE ON ORDER PAGE

    ///vvv Need to loop to make sure this tab is made active,incase someone is draggine/selecting another tab)
    extension.tabs.update(dashTab, {
        active: true
    })
    //vv fetch post to /complete to make sure order can be completed, then get resonse if success or order no longer available or just error.
    const response = await fetch(site+"complete", {
        method: "POST", 
        mode: "cors",
        credentials: "same-origin",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({"task_id": orderInf.task_id})
    });
    if (!response.ok) {
        console.error("Failed to complete task:", response.status, response.statusText);
        extension.runtime.sendMessage({ message: "issue"});
        return; // Stop further processing
    }
    
    
        const res = await response.json();

        if (res.message) {
            // Handle different message cases
            if (res.message == "complete") {
                // console.log("Sending Complete");
                extension.runtime.sendMessage({ message: "complete" });
            } else if (res.message == "expired") {
                extension.runtime.sendMessage({ message: "expired" });
            } else if (res.message == "badip") {
                extension.runtime.sendMessage({ message: "badip" });
            } else if (res.message == "country") {
                // console.log("Country Issue");
                extension.runtime.sendMessage({ message: "country" });
            } else {
                extension.runtime.sendMessage({ message: "issue" });
            }
        } else {
            extension.runtime.sendMessage({ message: "issue" });
        }
    } catch (error) {
        console.error("Error parsing response:", error);
        extension.runtime.sendMessage({ message: "issue" });
    }

}



function flip_user_status(signIn, user_info) {
    if (signIn) {
        // console.log(user_info)
        const postdata = {
            'email':user_info.email,
            'password':user_info.pass,
            'ext': true
          };
          //CHANGE DATA TO Form URLSearchParams bullshit vvvvvv
        const rawData = new URLSearchParams(Object.keys(postdata).map(key=>[key,postdata[key]]));  
        return fetch(site+'clickin', {
            method: 'POST',
            headers: {
                'content-type': 'application/x-www-form-urlencoded'
              },
              body: rawData
        })
            .then(res => {
                // console.log(res);
                return new Promise(resolve => {
                    if (res.status !== 200) {
                        return resolve('fail');// console.log("should say 401 unauthorized", res.status)
                    }
                    // console.log("USERSTATUS SAVED?", res.status)
                    extension.storage.local.set({ userStatus: signIn, user_info }, function (response) {
                        if (extension.runtime.lastError) resolve('fail');

                        user_signed_in = signIn;
                        resolve('success');
                    });
                })
            })
            .catch(err => console.log(err));
    } 
    else if (!signIn) {
        return new Promise(resolve => {
            extension.storage.local.get(['userStatus', 'user_info'], function (response) {
                // console.log(response);
                if (extension.runtime.lastError) resolve('fail');
    
                if (response.userStatus === undefined) resolve('fail');
                extension.storage.local.set({ userStatus: signIn, user_info: {} }, function (response) {
                    if (extension.runtime.lastError) resolve('fail');
                    //Set popup as Login again
                    extension.browserAction.setPopup({
                        popup: "/pages/login.html"
                    })
                    extension.browserAction.setBadgeText( {text: "Login"});
                    extension.browserAction.setBadgeBackgroundColor({color: "red"})
                    //reset variables:
                    dashTab=null; searchTab=null;destTab=null;orderInfo=null; subTimer=null
                    user_signed_in = signIn;
                    resolve('success');
                });
                fetch(site+'clickout', {
                    method: 'GET',
                    headers: {
                        'Authorization': 'Basic ' + btoa(`${response.user_info.email}:${response.user_info.pass}`)
                    }
                })
                    .then(res => {
                        // console.log(res);
                        if (res.status !== 200) resolve('fail');
    
                        // extension.storage.local.set({ userStatus: signIn, user_info: {} }, function (response) {
                        //     if (extension.runtime.lastError) resolve('fail');
                        //     //Set popup as Login again
                        //     //reset variables:
                        //     dashTab=null; searchTab=null;destTab=null;orderInfo=null
                        //     user_signed_in = signIn;
                        //     resolve('success');
                        // });
                    })
                    .catch(err => console.log(err));
            });
        }); 
    }
}


function is_user_signed_in() {
    return new Promise(resolve => {
        extension.storage.local.get(['userStatus', 'user_info'],
            function (response) {
                if (extension.runtime.lastError) resolve({ userStatus: 
                    false, user_info: {} })
            resolve(response.userStatus === undefined ?
                    { userStatus: false, user_info: {} } :
                    { userStatus: response.userStatus, user_info: 
                    response.user_info }
                    )
            });
    });
}

//WHAT HAPPENS WHEN EXT ICON IS CLICKED (dash.js logout makes it default back to LOGIN popup if you logout from there)
extension.browserAction.onClicked.addListener(function () {
    if (!destTab)
   {preLoginCheck();}
});

function preLoginCheck(){
    // console.log("prelogincheck")
    is_user_signed_in()
        .then(res => {
            if (res.userStatus) {
                // if (return_session) {
                //     extension.windows.create({
                //         url: '../pages/dash.html',
                //         width: 300,
                //         height: 600,
                //         focused: true
                //     }, function () { return_session = false });
                // } else 
                {
                    //CHECKS IF ORDER TAB (of last known ID) IS OPEN, IF NOT, MAKES NEW ORDER TAB
                    // console.log("logged_in");
                    extension.browserAction.getPopup({}, function(url) {
                        // console.log("The popup's URL is " + url);
                        if (url){
                            return extension.browserAction.setPopup({popup: ""})
                        }
                        dashTab ? getDash(): extension.tabs.create({url: '../pages/dash.html'});
                      });
                }
            } 
            else {
                // console.log("not_logged_in")
                extension.browserAction.setPopup({
                    popup: "../pages/login.html"
                })
                extension.browserAction.setBadgeText( {text: "Login"});
                extension.browserAction.setBadgeBackgroundColor({color: "red"})
            }
        })
        .catch(err => console.log(err));
}

function getDash(){
    extension.tabs.get(dashTab, ()=> {
        //Might not need this- CHECK
        if (extension.runtime.lastError) {
            extension.tabs.remove(dashTab);
            extension.tabs.create({url: '../pages/dash.html'});
        } else {
        /////
            extension.tabs.update(dashTab, {active: true});
            extension.windows.getAll({populate: true}, function(windows) {
                windows.forEach(function(window) {
                  window.tabs.forEach(function(tab) {
                    if (tab.id === dashTab) {
                      if (window.state === 'minimized') {
                        extension.windows.update(window.id, {state: 'normal'});
                      }
                      else{
                        extension.windows.update(window.id, { 'focused': true });
                      }
                      return;
                    }
                })
            })
        })
        }
    })
}

extension.tabs.onCreated.addListener(handleCreated);
extension.tabs.onActivated.addListener(handleChanged);
extension.tabs.onUpdated.addListener(handleUpdated)
extension.tabs.onRemoved.addListener(handleRemoved);
// extension.tabs.onMoved.addListener(handleMoved);
// extension.tabs.onAttached.addListener(handleAttached);
// extension.tabs.onDetached.addListener(handleDetached);

function handleCreated(tab) {
    // console.log("THIS TAB JUST CREATED!!!!!", tab.id);
  }

function handleChanged(changedInfo) {
    // console.log("tab changed!", changedInfo.tabId)
    if (destTab && changedInfo.tabId != destTab) {
        canLock=true
        tabLock(changedInfo)
    }
    else {
        canLock=false; 
        clearTimeout(lockloop)
    }
}
// function handleMoved(movedInfo) {
//     console.log("tab moved!", movedInfo.tabId)
//     tabLock(movedInfo)
// }
// function handleAttached(movedInfo) {
//     console.log("tab Attached!", movedInfo.tabId)
//     tabLock(movedInfo)
// }
// function handleDetached(movedInfo) {
//     console.log("tab Detached!", movedInfo.tabId)
//     tabLock(movedInfo)
// }

function handleUpdated(tabId, changeInfo, tabInfo){
    // console.log(`Updated tab: ${tabId}`);
    //console.log("Changed attributes: ", changeInfo);
    // console.log("New tab Info: ", tabInfo);


// } else if (request.message==='check?') {
//     (orderInfo && !destTab) ? sendResponse({ 
//             message: 'yes', 
//             payload: { orderInfo }
//     }) : sendResponse({ 
//         message: 'no', 
//         payload: { orderInfo }
// })



    
    if (orderInfo){
        // console.log("exact?",orderInfo.exact)
        let urlMatch=false
        let tabUrl=tabInfo.url.replaceAll('/','')
        let orderUrl=orderInfo.url.replaceAll('/','')
        if (subTimer){orderUrl=orderInfo.suburl.replaceAll('/','')}
        // console.log("predest:",preDest,"!destTab:",!destTab)
        // console.log(tabUrl,orderUrl)
        if (orderInfo.exact){// && !orderInfo.url.includes("watch?") && (!orderInfo.suburl || !orderInfo.suburl.includes("watch?"))) { 
            if (tabUrl==orderUrl){urlMatch=true}
        }else if (tabUrl.includes(orderUrl)){urlMatch=true}
        console.log("urlmatch?",urlMatch, "preDest", preDest, "mapSearched?",mapSearched, "destTab?", destTab)
        if (!urlMatch){
            if (searchTab.id !=tabId){return}
            // if (changeInfo.status!='loading'){
                        // console.log("NOTLOADING")
                        extension.tabs.sendMessage(tabId,{ message: 'preCheck', payload: {orderInfo}},
                        function(response) {
                            // console.log(response)
                            if(extension.runtime.lastError) {return }//console.log("fUchrome")}
                            if (response.message && response.message === 'preChecked!'){
                                // console.log("preChecked!")
                        }})
                    // }
                
        }
        else if (((preDest || mapSearched) && !destTab)|| (subTimer && destTab)){
            if (mapSearched && !preDest && !orderInfo.url.includes("/place/")){return}//makes mapsearch bypass only work if finalDest is /place/
            // console.log("Final Destination, suburl:",subTimer!=null);
            destTab=tabInfo.id
            preDest=null;
            destInject(destTab,orderInfo.seconds, (orderInfo.suburl && !subTimer))
            subTimer=null
            }}}

function destInject(tab,time, suburl=false){
    extension.tabs.executeScript(tab, {
        code: 
            `(window.browser && browser.runtime) ? extension=browser: extension=chrome
            let timer, theDiv, timerInterval
            const starTime=${time}; const suburl=${suburl};
            extension.runtime.sendMessage({ message: 'start?', payload: document.referrer },
                function (response) {if (response && response.message && response.message=="start"){
                    timer=${time};
                    if (typeof preDiv !== 'undefined'){preDiv.remove();}

                    theDiv=document.createElement('txt');
                    theDiv.innerText=("Stay on page: " + timer + " seconds");
                    theDiv.style.position="fixed";
                    theDiv.style.zIndex="1001"
                    theDiv.style.top=0;
                    theDiv.style.left="50%";
                    theDiv.style.top="20%";
                    theDiv.style.transform="translate(-50%,-50%)";
                    theDiv.style.fontSize="large";
                    theDiv.style.backgroundColor="chartreuse"; 
                    theDiv.style.color="black";
                    theDiv.style.border= "2px solid black";
                    theDiv.style.borderRadius= "5px";
                    theDiv.style.fontWeight = 'bold';
                    theDiv.style.userSelect='none';
                    theDiv.style.lineHeight="1.6";
                    theDiv.style.fontFamily= "Arial";
                    theDiv.style.padding='10px 15px';

                    theDiv.style.color="black";
                    document.body.appendChild(theDiv);
                    timerInterval=setInterval(timerUpdate, 1000);
            }})
            
            function timerUpdate(){
            if (document.hidden){}
            else if (suburl && timer <= Math.ceil(starTime*.5)){
                clearInterval(timerInterval);
                extension.runtime.sendMessage({ message: 'suburl',payload: timer },
                    function (response) {})
            }
            else if (timer<=0) {
                clearInterval(timerInterval);
                extension.runtime.sendMessage({ message: 'missComplete', payload: window.location.href  },
                    function (response) {})
            } else{
                theDiv.innerText=("Stay on page: " +--timer+ " seconds");
                extension.runtime.sendMessage({ message: 'countdown', payload: timer  },
                    function (response) {})
            }
            }`
})

}

function handleRemoved(tabId, removeInfo) {
    // console.log(`Tab: ${tabId} is closing`);
    // console.log("tabId",tabId, "destTab",destTab, "searchTab",searchTab, "dashTab", dashTab)
    // console.log("dashTab=TabID",(dashTab==tabId) )
    //check if searchTab is closed as well? and null searchTab and orderInfo ********(&(*&(*&(*&(*&*&***********
    //&&searchTab && orderInfo &&  as well? to make sure order is correct one?
    // console.log("destTab=tabId", tabId==destTab)
    if (dashTab && tabId==dashTab) {
        // console.log("dashTab Closed")
        closeTabs()
    }
    else if (searchTab && !destTab && tabId==searchTab.id ){
        // console.log("searchTab Closed")
        preDest=null; orderInfo=null; mapSearched=null
        searchTab=null; subTimer=null
    }
    else if (destTab && tabId==destTab){
        // console.log("destTab Closed")
        // closeTabs()
        destTab=null;
        extension.runtime.sendMessage({ message: "closedTab"});
    }
        // alert("You bAaAaAd boy");
  }

//COPY text 
function copyToClipboard(phrase) {
    // console.log("clipboard recieved phrase:",phrase)
    txt.value = phrase;
    txt.focus(); txt.select();
    document.execCommand("copy");
}

function tabLock(changedInfo){
    if (destTab){//change to check once page is on dest. url.
        // console.log("locktabstart")
        /*if (changedInfo.windowID==searchTab.windowID)*/ {
            //console.log("sameWindow")
            lockloop(destTab);
        }
    } 
}

function lockloop(tabId){
    extension.tabs.get(tabId,callback);////check if tab exixsts, if not, runtime.lastError will occur
    function callback() {
        if (extension.runtime.lastError) {
            // console.log(extension.runtime.lastError.message);
        } else {
            // console.log("tabloop")
            let complete=extension.tabs.update(tabId, {
                active: true
            })
            if (canLock && destTab) {setTimeout(() =>{
                lockloop(tabId);
            }, 100)
            }
        }
    
}}


