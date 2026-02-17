window.addEventListener('DOMContentLoaded', function () {
    var match = document.cookie.split('; ').find(function (row) { return row.startsWith('csrf_token='); });
    if (match) {
        var token = match.split('=')[1];
        var input = document.getElementById('csrf_token');
        if (input) input.value = token;
    }
});
