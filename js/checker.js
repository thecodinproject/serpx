(window.browser && browser.runtime) ? extension=browser: extension=chrome

let destInfo,
check,
preDiv,
checkTimer,
preTimer,
altered=[],
destURL=[]


extension.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.message=='preCheck'){
    // console.log("preCheck")
    destInfo=request.payload.orderInfo
    // console.log(destInfo)
    check=false
    preCheck(); 
    sendResponse({message:"preChecked!"})
}});

function preCheck(){
    for (element of altered){
      element.style.backgroundColor=""
      // console.log("cleared element:",element)
    }
    altered=[];
    if (preDiv){preDiv.remove()}
    clearInterval(checkTimer)
    // console.log("CHECKING for:", destInfo.url, ", with:", destInfo.engine)
    // console.log("searchEngine is:",window.location.hostname+window.location.pathname )
    if (destInfo.engine=="maps" &&  !window.location.pathname.includes("/place") && !window.location.pathname.includes("/search")) {
      return} //console.log("mapMainpage")}
    if (destInfo.engine=="youtube" && window.location.href.includes("watch?")){
      return}
    if (destInfo.engine=="google" && window.location.pathname.includes("maps")){
      // console.log("engine google pathname has Map")
      return htmlText(" WRONG SEARCH ENGINE ")
    } else if (destInfo.engine=="maps" && !window.location.pathname.includes(destInfo.engine)){
      // console.log("engine Map pathname no Map")
      return htmlText(" WRONG SEARCH ENGINE ")
    } else if (destInfo.engine!="maps" && !window.location.hostname.includes(destInfo.engine)){
      // console.log("engine !Map pathname !engine", destInfo)
      return htmlText(" WRONG SEARCH ENGINE ")
    }
    
    let wrongPhrase=true
    let urlPhrase=destInfo.phrase.split(" ").join("+");
    urlPhrase=encodeURI(urlPhrase);
    let loc=window.location.toString()

    if (destInfo.engine=="youtube"){
      // console.log("YepYoutube")
      urlPhrase="="+urlPhrase
      if (!location.href.includes("results?")){return}
      if (loc.includes(urlPhrase)){
        // console.log("CorrectPhraseNeedtoCheckAftersubString")
        if (window.location.href.substring(window.location.href.indexOf(urlPhrase) + urlPhrase.length) == ''){
          // console.log("CorrectPhrase100")
          wrongPhrase=false
        }
      }
    }
    else if (destInfo.engine=="maps"){
      let tempPhrase="!1s"+urlPhrase+"!"
      let mPhrase="/"+urlPhrase+","
      urlPhrase="/"+urlPhrase+"/"
      
      if (loc.includes(urlPhrase)|| loc.includes(tempPhrase) || loc.includes(mPhrase)){
        wrongPhrase=false;
        extension.runtime.sendMessage({ message: 'mapSearched', payload: {mapSearched:true} },//bypass to allow redirects map searches right to place to work
        function (response) {})
      }
    }
    else {
      // urlPhrase="="+urlPhrase+"&"
      urlPhrase="="+urlPhrase.replace(/\+/g, '').replace(/%20/g, '')
      if (loc.replace(/\+/g, '').replace(/%20/g, '').includes(urlPhrase)){
      wrongPhrase=false
    }
    }
    if (!wrongPhrase) {
      // console.log("CorrectPhrase!")
      check=true
      urlCheck()
      checkTimer = setInterval(urlCheck,1000)
    }
    else {htmlText(" WRONG SEARCH PHRASE ")}
}  


function urlCheck(){
  if (check) {
    let destUrl=destInfo.url.replaceAll('/','')
    // console.log("CHECKING FOR URL")
    for (const link of document.links) {
        if ((!destInfo.exact && link.href.replaceAll('/','').includes(destUrl)||(destInfo.exact && link.href.replaceAll('/','')==destUrl))){
          // console.log("MATCHING URL")
          let li= link.closest("li");
          let div= link.closest("div")
          if (destInfo.engine=="youtube"){
            // div.style.backgroundColor="lawngreen"; 
            //     altered.push(div)
            link.style.border='5px solid red'
          } else{
            if (!li) {
              div.style.backgroundColor="lawngreen"; 
              altered.push(div)
            } else {
              let divDist=0; let tempLink=link
              while (div != tempLink) {
                tempLink=tempLink.parentElement; divDist++;
              }
              tempLink=link; let liDist=0;
              while (li != tempLink) {
                tempLink=tempLink.parentElement; liDist++;
              }
              if (liDist > divDist) {
                div.style.backgroundColor="lawngreen"; 
                altered.push(div)
              } else {
                li.style.backgroundColor="lawngreen"; 
                altered.push(li)
            }}
            if (!link.checkVisibility()) {
              let parent=link.parentElement;
              while(!parent.checkVisibility()){
                parent=parent.parentElement;
              }
              parent.style.backgroundColor="lawngreen";
              altered.push(parent)
            }
          }
          link.style.backgroundColor="yellow";
          link.style.color="black"
          altered.push(link)
          destURL.push(link)
          if (check){
            htmlText(" URL FOUND! ", "chartreuse", true);
          }
          check=false;
          // console.log('URL FOUND!!!!!')
          // return 
        }
    }
    if (location.href.includes("youtube.com")){
      // console.log("YOUTUBERECHECKconyo")
      clearInterval(preTimer)
      preTimer=setInterval(preCheck,1000)
    } else if (location.href.includes("/maps/")){
      if (check && destInfo.mapname){
        let found=false
        // console.log("checkingForBizName")
        let busName=destInfo.mapname.split(" ").join("+");
        busName="/"+busName;
        busName=busName.toLowerCase()
        for (const link of document.links){
          let uri=decodeURI(link.href).toLowerCase()
          if (uri.includes(busName+'/')||uri.includes(busName+',')){
            link.style.backgroundColor="lawngreen";
            found=true
            altered.push(link)
            htmlText(" PLACE FOUND! ","chartreuse", true,"20%","1000");
            extension.runtime.sendMessage({ message: 'mapSearched', payload: {mapSearched:true} },//bypass to allow normal /place/ destUrls to work
              function (response) {})
          }
        }
        if (!found){
          const buttons = document.querySelectorAll('button');
          buttons.forEach(button => {
            const ariaLabel = button.getAttribute('aria-label');
            if (ariaLabel === destInfo.mapname) {
              button.style.border='10px solid lawngreen'
              altered.push(button)
              htmlText(" PLACE FOUND! ","chartreuse", true,"20%","1000");
              extension.runtime.sendMessage({ message: 'mapSearched', payload: {mapSearched:true} },//bypass to allow normal /place/ destUrls to work
                function (response) {})
            }
          }) 
        }
      }
      clearInterval(preTimer)
      preTimer=setInterval(preCheck,1000)
    }
  } else {clearInterval(checkTimer)}
}  
    
    


function htmlText(message, color="red",foundDest=false, tPercent="20%",zIndex="999"){
    preDiv=document.createElement('txt');
    let text=message;
    preDiv.appendChild(document.createTextNode(text));
    preDiv.style.position="fixed";
  	preDiv.style.top=0;
    preDiv.style.left="50%";
  	preDiv.style.top=tPercent;
    preDiv.style.transform="translate(-50%,-50%)";
    preDiv.style.fontSize="large";
    preDiv.style.fontFamily="Arial"
    preDiv.style.backgroundColor=color; 
    preDiv.style.color="black";
  	preDiv.style.zIndex = zIndex;
    preDiv.style.border= `2px solid black`;
    preDiv.style.borderRadius= "5px";
    preDiv.style.padding='5px';
    preDiv.style.userSelect='none'
    preDiv.style.fontWeight = 'bold'
    preDiv.style.lineHeight="1.6";
    document.body.appendChild(preDiv);
    foundDest? destFound():destLost()
}

function destFound() {
  clearTimeout(urlCheck)
  extension.runtime.sendMessage({ message: 'destFound' },
    function (response) {
        // console.log(response)
        // if (response.message === 'yes'){
        //     //ORDER IN PROCESS
        //     console.log("CHECK!!!!!", response)
        //     console.log(response.payload)
        //     destInfo=response.payload.orderInfo
        //     console.log(destInfo)
        //     check=true
        //     urlCheck()
        // }
        // else (
        //     //NO ORDER IN PROCESS
        //     console.log(response)
        //     )
    
})}


function destLost() {
  clearTimeout(urlCheck)
  extension.runtime.sendMessage({ message: 'mapSearched', payload: {mapSearched:false} },
        function (response) {})
  extension.runtime.sendMessage({ message: 'destLost' },
    function (response) {
})}