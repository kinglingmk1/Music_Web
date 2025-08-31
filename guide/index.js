window.onload = function() {
    unload(`description`);
};
function unload(input){
    const descriptions = document.querySelectorAll('.description, .index_html, .index_css, .data_json, .loved_json, .lrc_format, .img, .playmusic_js');
    descriptions.forEach(desc => { desc.style.display = (desc.classList.contains(input)) ? 'block' : 'none'; });
}