const allCaches = [`DevilCars-v28`, `DevilCars-img-158`, `DevilCars-acf-v27`, `DevilCars-temp-v26`];
const [staticCacheName, contentImgsCache, additionalCacheFiles, tempCacheName] = allCaches;

const sw = new URLSearchParams(this.location.search).get('sw');
// const permanentRefreshs=[`/data/busstop.php`, `/data/timetables.php`, `/data/punktysprzedazy.php`];
const permanentRefreshs = [ //Only for staticCacheName
    // '/',
    '/css/box.css',
    '/assets/css/all.css',
    '/assets/css/custom.css',
    '/assets/css/nk.css',
    '/js/box.js',
    '/assets/js/all.js',
    '/assets/js/imagesloaded.pkgd.min.js',
    '/assets/js/imagesloaded.pkgd.min.js',
    '/assets/js/isotope.pkgd.min.js',
    // '/kontakt',
    // '/oferta',
    // '/prezent',
    // '/kalendarz-imprez',
    // '/tor',
    // '/blog',
    // '',
    // '',
    // '/samochody/mclaren',
    // '/samochody/ferrari-f430',
    // '/samochody/lamborghini-gallardo',
    // '/samochody/bmw-biturbo-performance',
    // '/samochody/ferrari-italia-458',
    // '/samochody/aston-martin-db9',
    // '/samochody/porsche-gt3-997',
    // '/samochody/audi-r8',
    // '/samochody/nissan-gtr',
    // '/samochody/porsche-gt3rs-996',
    // '/samochody/ktm-x-bow-cup',
    // '/samochody/dodge-viper',
    // '/samochody/audi-tt',
    // '/samochody/aston-martin-vantage',
    // '/samochody/chevrolet-camaro',
    // '/samochody/porsche-911-carrera',
    // '/samochody/ariel-atom',
    // '/samochody/chevrolet-corvette',
    // '/samochody/subaru-impreza-wrx',
    // '/samochody/bmw-m-power-e46',
    // '/samochody/mitsubishi-lancer-evo-10',
    // '/samochody/subaru-sti-turbo',
    // '/samochody/ktm-x-bow',
    // '/samochody/ford-mustang',
    // '/samochody/nissan-370z',
    // '/samochody/bmw-z4',
    // '/samochody/dodge-viper-gts',
    // '/samochody/ariel-nomad',
    // '/samochody/polaris-slingshot',
    // '/samochody/bentley-continental-gt-speed',
    // '/samochody/zenos-e10s',
    // '/samochody/mercedes-a45-amg',
    // '/samochody/lexus-rc-f-sport',
    // '/samochody/ford-focus-rs',
    // '/samochody/toyota-celica-st-185-carlos-sainz',
    // '/samochody/bmw-i8',
    // '/samochody/golf-v-tdi-cup',
    // '/samochody/renault-clio-iii-turbo-sport',
    // '/samochody/lotus-7',
    // '/samochody/formula-3',
    // '/samochody/kurs-driftingu',
    // '/samochody/drift-taxi',
    // '/samochody/maserati-gt-mc-stradale',
    // '/samochody/ford-mustang-14',
    // '/samochody/bmw-m4',
    // '/samochody/off-road-4x4',
    // '/samochody/v-storm',

    // '/samochody/ariel-atom-vs-ktm-x-bow',
    // '/samochody/ktm-x-bow-vs-subaru-sti-turbo',
    // '/samochody/ktm-x-bow-vs-porsche-911-carrera',
    // '/samochody/ktm-x-bow-vs-subaru-impreza-wrx',
    // '/samochody/subaru-impreza-wrx-vs-bmw-m-power-e46',
    // '/samochody/ktm-x-bow-vs-bmw-biturbo-performance',
    // '/samochody/subaru-impreza-wrx-vs-porsche-911-carrera',
    // '/samochody/subaru-impreza-wrx-vs-bmw-biturbo-performance',
    // '/samochody/porsche-911-carrera-vs-bmw-biturbo-performance',
    // '/samochody/subaru-sti-turbo-vs-porsche-911-carrera',
    // '/samochody/ariel-atom-vs-subaru-sti-turbo',
    // '/samochody/subaru-sti-turbo-vs-bmw-biturbo-performance',
    // '/samochody/ferrari-f430-vs-lamborghini-gallardo',
    // '/samochody/ferrari-f430-vs-audi-r8',
    // '/samochody/ferrari-f430-vs-nissan-gtr',
    // '/samochody/nissan-gtr-vs-audi-r8',
    // '/samochody/lamborghini-gallardo-vs-audi-r8',
    // '/samochody/lamborghini-gallardo-vs-nissan-gtr',
    // '/samochody/ferrari-italia-458-vs-ferrari-f430',
    // '/samochody/lamborghini-gallardo-vs-ferrari-italia-458',
    // '/samochody/ferrari-f430-vs-ktm-x-bow',
    // '/samochody/ferrari-f430-vs-ariel-atom',
    // '/samochody/lamborghini-gallardo-vs-ktm-x-bow',
    // '/samochody/lamborghini-gallardo-vs-ariel-atom',
    // '/samochody/lamborghini-gallardo-vs-ferrari-f430-vs-audi-r8',
    // '/samochody/lamborghini-gallardo-vs-ferrari-f430-vs-nissan-gtr',
    // '/samochody/aston-martin-db9-vs-ferrari-italia-458',
    // '/samochody/audi-r8-vs-ktm-x-bow',
    // '/samochody/ford-mustang-vs-ktm-x-bow',
    // '/samochody/mitsubishi-lancer-evo-10-vs-subaru-impreza-wrx',
    // '/samochody/audi-r8-vs-ferrari-f430-vs-lamborghini-gallardo-vs...',
    // '/samochody/ariel-atom-vs-bmw-biturbo-performance',
    // '/samochody/ktm-x-bow-vs-porsche-gt3',
    // '/samochody/dodge-viper-vs-ktm-x-bow',
    // '/samochody/bmw-m-power-e46-vs-mitsubishi-lancer-evo-10',
    // '/samochody/lamborghini-gallardo-aston-martin-db9',
    // '/samochody/ferrari-f430-aston-martin-db9',
    // '/samochody/nissan-gtr-aston-martin-db9',
    // '/samochody/ktm-x-bow-bmw-m-power-e46',
    // '/samochody/ktm-x-bow-vs-nissan-gtr',

];
// const dontPermanentRefreshsFiles=[
//     '.mp4',
//     '.jpeg',
//     '.jpg',
//     '.png',
// ];
// const onlineFirsts=[`/data/slider.php`, `/data/news.php`];
const onlineFirsts = [
    '/thumbnail/',
    '/new_panel/'
];

const onlineOnly = [
    '/new_panel',
    '/js/panel.js',
];

//Operacje które występują podczas instalacji SW w przeglądarce.
self.addEventListener('install', function (event) {
    event.waitUntil
    (
        //Ładowanie Cache
        // caches.open(tempCacheName).then(function(cache)
        // {
        //     cache.addAll([
        //         '/js/sw_install.js',
        //         '/',
        //         // '/css/box.css',
        //     ]);
        // }),
        caches.open(staticCacheName).then(function (cache) {
            //Strony które nie muszą być stale odświerzane.
            // cache.addAll([
            // '/',
            // '/css/box.css',
            // '/assets/css/all.css',
            // '/assets/css/custom.css',
            // '/assets/css/nk.css',
            // ]);
            for (var i = 0; i < permanentRefreshs.length; i++) {
                cache.add(permanentRefreshs[i]);
            }
            // cache.addAll(permanentRefreshs);

            /* ↓ Pobieranie zewnętrznych Cache ↓ */
            const adresy_zewnetrzne = [
                'https://use.fontawesome.com/35d98a438b.css',
                'https://use.fontawesome.com/releases/v4.7.0/css/font-awesome-css.min.css',
                'https://fonts.googleapis.com/css?family=Lato:300,300i,400,400i,700,700i,900,900i&subset=latin-ext',
                'https://use.fontawesome.com/35d98a438b.js',
                'https://connect.facebook.net/pl_PL/sdk.js',
                'https://www.google-analytics.com/analytics.js',
                'https://www.smartsuppchat.com/loader.js?',
            ];

            adresy_zewnetrzne.filter(function (adres_zewnetrzny) {
                fetch(adres_zewnetrzny,
                    {
                        mode: 'no-cors' // 'cors' by default
                    })
                    .then(function (response) {
                        cache.put(adres_zewnetrzny, response)
                    });
            });
            /* ↑ Pobieranie zewnętrznych ciasteczek ↑ */
        })
    );
});

//Operacje które występują podczas aktywacji SW w przeglądarce.
self.addEventListener('activate', function (event) {
    event.waitUntil
    (
        caches.keys().then(function (cacheNames) {
            return Promise.all
            (
                cacheNames.filter(function (cacheName) {
                    return cacheName.startsWith('DevilCars-') && !allCaches.includes(cacheName);
                }).map(function (cacheName) {
                    return caches.delete(cacheName);
                })
            );
        })
    )
});

/* ↓ Obsługa wywołań ze strony ↓ */
self.addEventListener('fetch', function (event) {
    var ok = true;
    const requestUrl = new URL(event.request.url);
    onlineOnly.filter(function (onlineOnly) {
        if (requestUrl.pathname.startsWith(onlineOnly)) {
            ok = false;
        }
    });
    if (ok)
        event.respondWith
        (
            // console.log("a");
            //Sprawdzamy czy zapytanie jest w cache
            //caches.match(event.request, {ignoreSearch: true, ignoreVary: true}).then(function(response) //caches.match(event.request, {ignoreSearch: true, ignoreMethod: true, ignoreVary: true}).then(function(response)
            caches.match(event.request, {ignoreVary: true}).then(function (response) //caches.match(event.request, {ignoreSearch: true, ignoreMethod: true, ignoreVary: true}).then(function(response)
                // caches.match(event.request).then(function(response) //caches.match(event.request, {ignoreSearch: true, ignoreMethod: true, ignoreVary: true}).then(function(response)
            {
                //Jeżeli znaleziono odpowiedź to wysyłamy z pamięci.
                if (response) {
                    // const requestUrl = new URL(event.request.url);
                    if (requestUrl.origin === location.origin) {
                        //Offline first.
                        permanentRefreshs.filter(function (permanentRefresh) {
                            // if (requestUrl.pathname.startsWith(permanentRefresh))
                            if (requestUrl.pathname === permanentRefresh) {
                                return fetch(event.request).then(function (response) {
                                    if (response.status == 403 || response.status == 404) {
                                        return fetch('/404');
                                    }

                                    // caches.open(tempCacheName).then(function(cache){
                                    caches.open(staticCacheName).then(function (cache) {
                                        cache.put(requestUrl, response);
                                    });
                                }).catch(function () {
                                    console.log(`Brak połączenia internetowego.`);
                                });
                                // return response;
                            }
                        });

                        //Online first.
                        let ifOnlineFirst = 0;
                        onlineFirsts.filter(function (onlineFirst) {
                            if (requestUrl.pathname.startsWith(onlineFirst)) {
                                ifOnlineFirst = 1;
                            }
                        });

                        if (ifOnlineFirst != 1)
                            return response;
                        else
                            return fetch(event.request).then(function (responseNew) {
                                if (responseNew.status == 403 || responseNew.status == 404) {
                                    return response;
                                }

                                // caches.open(tempCacheName).then(function(cache)
                                caches.open(staticCacheName).then(function (cache) {
                                    cache.put(requestUrl, responseNew);
                                });
                                return responseNew.clone();
                            }).catch(function () {
                                console.log(`Brak połączenia internetowego.`);
                                return response;
                            });
                    } else
                        return response;
                }

                /* ↓ Jeżeli nie znaleziono to pobieramy z internetu. ↓ */
                //return fetch(event.request);
                return fetch(event.request).then(function (response) {
                    if (response.status == 403 || response.status == 404) {
                        return fetch('/404');
                    }

                    /* ↓ Pobdano zapytanie z internetu ↓ */
                    /* ↓ Dodawanie zdjęć do cache ↓ */
                    const requestUrl = new URL(event.request.url);
                    if (requestUrl.origin === location.origin) {
                        if (requestUrl.pathname.endsWith('.jpg') || requestUrl.pathname.endsWith('.jpeg') || requestUrl.pathname.endsWith('.png') || requestUrl.pathname.endsWith('.svg')) {
                            caches.open(contentImgsCache).then(function (cache) {
                                cache.put(requestUrl, response)
                                //return response;
                            })
                        }

                        if (requestUrl.pathname.endsWith('.pdf') || requestUrl.pathname.endsWith('.mp4')) {
                            caches.open(additionalCacheFiles).then(function (cache) {
                                cache.put(requestUrl, response)
                                //return response;
                            })
                        }
                    }
                    /* ↑ Dodawanie zdjęć do cache ↑ */
                    return response.clone();
                    /* ↑ Pobdano zapytanie z internetu ↑ */
                }).catch(function () {
                    return new Response("Brak połączenia internetowego.");
                });
                /* ↑ Jeżeli nie znaleziono to pobieramy z internetu. ↑ */
            })
        );
});
/* ↑ Obsługa wywołań ze strony ↑ */

self.addEventListener('message', function (event) {
    if (event.data.action === 'skipWaiting') {
        console.log(`SW ...`);
        self.skipWaiting();
    }
});
