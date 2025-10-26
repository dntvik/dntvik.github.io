// name: Checker TorrServer
// author: Виктор
// version: 1.0.1
// description: Находит локальный TorrServer и позволяет добавить его в альтернативный сервер

(function () {
    'use strict';

    Lampa.Platform.tv();

    var icon_add_server = '<svg fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="0.48"><g><path d="M12 5v14m7-7H5" stroke="currentColor" stroke-width="2"/></g></svg>';

    var ports = [8090, 8080];
    var hosts = ['127.0.0.1', 'localhost'];
    var subnets = ['192.168.0', '192.168.1', '10.0.0'];

    var serverFound = null;

    function checkHost(host, port, callback) {
        var xhr = new XMLHttpRequest();
        xhr.timeout = 1000;
        xhr.onreadystatechange = function () {
            if (xhr.readyState === 4) {
                if (xhr.status >= 200 && xhr.status < 300) {
                    if (/torrserver|torrsrv|version|json/i.test(xhr.responseText)) {
                        callback({ host: host, port: port });
                        return;
                    }
                }
                callback(null);
            }
        };
        xhr.ontimeout = function () { callback(null); };
        try {
            xhr.open('GET', 'http://' + host + ':' + port + '/', true);
            xhr.send();
        } catch (e) {
            callback(null);
        }
    }

    function scanCandidates(candidates, index, finalCallback) {
        if (index >= candidates.length) {
            finalCallback(null);
            return;
        }
        checkHost(candidates[index].h, candidates[index].p, function (result) {
            if (result) {
                finalCallback(result);
            } else {
                scanCandidates(candidates, index + 1, finalCallback);
            }
        });
    }

    function discoverTorrServer(finalCallback) {
        var candidates = [];
        var i, p;

        // hosts
        for (i = 0; i < hosts.length; i++) {
            for (p = 0; p < ports.length; p++) {
                candidates.push({ h: hosts[i], p: ports[p] });
            }
        }

        // subnets
        for (var s = 0; s < subnets.length; s++) {
            for (var j = 1; j <= 10; j++) {
                for (p = 0; p < ports.length; p++) {
                    candidates.push({ h: subnets[s] + '.' + j, p: ports[p] });
                }
            }
        }

        scanCandidates(candidates, 0, finalCallback);
    }

    function openLocalSettings(server) {
        var ip = server ? server.host : 'не найден';
        var port = server ? server.port : '';
        var html = $('<div class="about"><div class="about__title">Локальный TorrServer</div></div>');
        var fieldIP = $('<div class="selector" data-name="ip" data-type="input">IP: <span>' + ip + '</span></div>');
        var fieldPort = $('<div class="selector" data-name="port" data-type="input">Порт: <span>' + port + '</span></div>');
        var buttonAdd = $('<div class="selector" data-name="add" data-type="button">Добавить в альтернативный сервер ' + icon_add_server + '</div>');

        html.append(fieldIP).append(fieldPort).append(buttonAdd);
        Lampa.Controller.collectionSet(html);

        buttonAdd.on('hover:enter hover:click hover:touch', function () {
            if (server) {
                var url = 'http://' + server.host + ':' + server.port;
                Lampa.Storage.set('torrserver_url_alternative', url);
                Lampa.Noty.show('Добавлен альтернативный сервер: ' + url);
            } else {
                Lampa.Noty.show('Сначала нужно найти сервер');
            }
        });
    }

    function initPlugin() {
        console.log('Checker TorrServer plugin initialized');

        discoverTorrServer(function (server) {
            if (server) {
                serverFound = server;
                Lampa.Storage.set('local_torrserver', server);
                Lampa.Noty.show('TorrServer найден: ' + server.host + ':' + server.port);
            } else {
                Lampa.Noty.show('TorrServer не найден');
            }

            // Добавляем кнопку в шапку приложения
            var addBtn = $('<div class="head__action selector" id="LOCAL_TORRSERVER">' + icon_add_server + '</div>');
            $('#app > div.head > div > div.head__actions').append(addBtn);
            addBtn.on('hover:enter hover:click hover:touch', function () { openLocalSettings(serverFound); });
        });
    }

    if (window.appready) initPlugin();
    else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') initPlugin();
        });
    }

})();