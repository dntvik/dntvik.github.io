(function () {
    'use strict';

    Lampa.Platform.tv();

    var icon_add_server = '<svg fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" stroke="currentColor" stroke-width="0.48"><g><path d="M12 5v14m7-7H5" stroke="currentColor" stroke-width="2"/></g></svg>';

    // Настройки поиска TorrServer
    var ports = [8090, 8080];
    var hosts = ['127.0.0.1', 'localhost'];
    var subnets = ['192.168.0', '192.168.1', '10.0.0'];
    var timeout = 1000;

    function fetchWithTimeout(url, ms) {
        ms = ms || timeout;
        var controller = new AbortController();
        var id = setTimeout(function () { controller.abort(); }, ms);
        return fetch(url, { signal: controller.signal })
            .then(function (res) { clearTimeout(id); return res; })
            .catch(function () { clearTimeout(id); return null; });
    }

    function checkHost(host, port) {
        var url = 'http://' + host + ':' + port + '/';
        return fetchWithTimeout(url).then(function (res) {
            if (res && res.ok) {
                return res.text().then(function (text) {
                    if (/torrserver|torrsrv|version|json/i.test(text)) return { host: host, port: port };
                    return null;
                }).catch(function () { return null; });
            }
            return null;
        });
    }

    function discoverTorrServer() {
        var candidates = [];
        hosts.forEach(function (h) { ports.forEach(function (p) { candidates.push({ h: h, p: p }); }); });
        subnets.forEach(function (base) {
            for (var i = 1; i <= 10; i++) {
                ports.forEach(function (p) { candidates.push({ h: base + '.' + i, p: p }); });
            }
        });

        var chain = Promise.resolve(null);
        var found = null;

        candidates.forEach(function (c) {
            chain = chain.then(function (res) {
                if (res) {
                    found = res;
                    return res;
                }
                return checkHost(c.h, c.p);
            });
        });

        return chain.then(function () { return found; });
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

        discoverTorrServer().then(function (server) {
            if (server) {
                Lampa.Storage.set('local_torrserver', server);
                Lampa.Noty.show('TorrServer найден: ' + server.host + ':' + server.port);
            } else {
                Lampa.Noty.show('TorrServer не найден');
            }

            // Добавим кнопку в заголовок приложения для теста
            var addBtn = $('<div class="head__action selector" id="LOCAL_TORRSERVER">' + icon_add_server + '</div>');
            $('#app > div.head > div > div.head__actions').append(addBtn);
            addBtn.on('hover:enter hover:click hover:touch', function () { openLocalSettings(server); });
        });
    }

    if (window.appready) initPlugin();
    else {
        Lampa.Listener.follow('app', function (e) {
            if (e.type === 'ready') initPlugin();
        });
    }

})();