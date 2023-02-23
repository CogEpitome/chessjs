self.onmessage = async function(action) {
    let move = await searchPosition();
    self.postMessage(action, move);            
}