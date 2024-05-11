/*jshint multistr: true */

// ==UserScript==
// @name         Screeps alliance overlay (modified)
// @namespace    https://screeps.com/
// @version      0.2.9
// @author       James Cook
// @include      https://screeps.com/a/
// @run-at       document-ready
// @downloadUrl  https://raw.githubusercontent.com/LeagueOfAutomatedNations/loan-browser-ext/master/dist/alliance-overlay.user.js
// @grant        GM_xmlhttpRequest
// @require      http://ajax.googleapis.com/ajax/libs/jquery/1.8.3/jquery.min.js
// @require      http://www.leagueofautomatednations.com/static/js/vendor/randomColor.js
// @require      https://github.com/Esryok/screeps-browser-ext/raw/master/screeps-browser-core.js
// @connect      www.leagueofautomatednations.com
// ==/UserScript==

const loanBaseUrl = "http://www.leagueofautomatednations.com";

// [+] added
let overlayDisplayed = false;
// <<

let currentShard;
let allianceData;
let userAlliance;
function getAllianceLogo(allianceKey) {
    let data = allianceData[currentShard] ? allianceData[currentShard][allianceKey] : undefined;
    if (data) {
        return loanBaseUrl + "/obj/" + data.logo;
    }
}

let colorMap = {};
function getAllianceColor(allianceKey) {
    if (!colorMap[allianceKey] && allianceData[currentShard] && allianceData[currentShard][allianceKey]) {
        let seed = allianceData[currentShard][allianceKey].name;
        let [hue,sat,lum] = randomColor({
            hue: "random",
            luminosity: "light",
            seed,
            format: "hslArray"
        });

        // the canvas opacity means the light color set has bad costrast: reduce luminosity to improve
        colorMap[allianceKey] = `hsl(${hue},${sat}%,${lum/2}%)`;
    }

    return colorMap[allianceKey];
}

function updateCurrentShard() {
    let match = window.location.hash.match(/#!\/map\/shard(\d)/);
    if (match) {
        currentShard = 'shard' + match[1];
    }
}

// query for alliance data from the LOAN site
function ensureAllianceData(callback) {
    if (allianceData) {
        if (callback) callback();
        return;
    }
    
    // updateCurrentShard();
    const shards = ['shard0', 'shard1', 'shard2', 'shard3'];

    let loadedShards = 0;
    let _allianceData = {};
    let _userAlliance = {};
    
    function checkAllLoaded() {
        if (loadedShards === shards.length) {
            allianceData = _allianceData;
            userAlliance = _userAlliance;
            console.log(allianceData);
            console.log(userAlliance);
            
            console.log("Alliance data loaded from LOAN.");
            if (callback) callback();
        }
    }

    // >> temporary loading updated alliances.js because loan has outdated data for now
    GM_xmlhttpRequest({
        method: "GET",
        url: 'http://raw.githubusercontent.com/NesCafe62/screeps-alliance-map/master/alliances.js',
        onload: function(response) {
            const data = JSON.parse(response.responseText);

            for (let allianceKey in data) {
                for (let userName of data[allianceKey]) {
                    _userAlliance[userName] = allianceKey;
                }
            }
                
            _allianceData['shard0'] = data;
            _allianceData['shard1'] = data;
            _allianceData['shard2'] = data;
            _allianceData['shard3'] = data;
            loadedShards = 4;
            checkAllLoaded();
        }
    });
    // <<

    /* for (let shard of shards) {
        GM_xmlhttpRequest({
            method: "GET",
            url: (loanBaseUrl + "/map/" + shard + "/alliances.js"),
            onload: function(response) {
                const data = JSON.parse(response.responseText);

                for (let allianceKey in data) {
                    let alliance = data[allianceKey];
                    for (let userIndex in alliance.members) {
                        let userName = alliance.members[userIndex];
                        _userAlliance[userName] = allianceKey;
                    }
                }
                
                _allianceData[shard] = data;
                loadedShards++;
                checkAllLoaded();
            }
        });
    } */
}

// Stuff references to the alliance data in the world map object. Not clear whether this is actually doing useful things.
function exposeAllianceDataForAngular() {
    let app = angular.element(document.body);
    let $timeout = angular.element('body').injector().get('$timeout');

    $timeout(()=>{
        let worldMapElem = angular.element($('.world-map'));
        let worldMap = worldMapElem.scope().WorldMap;

        worldMap.allianceData = allianceData;
        worldMap.userAlliance = userAlliance;

        // [+] added
        overlayDisplayed = true;
        // <<
        recalculateAllianceOverlay();
    });

    for (let shard in allianceData) {
        for (let allianceKey in allianceData[shard]) {
            addStyle(".alliance-" + allianceKey + " { background-color: " + getAllianceColor(allianceKey) + " }");
            addStyle(".alliance-logo-3.alliance-" + allianceKey + " { background-image: url('" + getAllianceLogo(allianceKey) + "') }");
        }
    }
}

// inject a new CSS style
function addStyle(css) {
    let head = document.head;
    if (!head) return;

    let style = document.createElement('style');
    style.type = 'text/css';
    style.innerHTML = css;

    head.appendChild(style);
}

function generateCompiledElement(parent, content) {
    let $scope = parent.scope();
    let $compile = parent.injector().get("$compile");

    return $compile(content)($scope);
}

// Bind the WorldMap alliance display option to the localStorage value
function bindAllianceSetting() {
    let alliancesEnabled = localStorage.getItem("alliancesEnabled") !== "false";
    let worldMapElem = angular.element($('.world-map'));
    let worldMap = worldMapElem.scope().WorldMap;

    worldMap.displayOptions.alliances = alliancesEnabled;

    worldMap.toggleAlliances = function () {
        worldMap.displayOptions.alliances = !worldMap.displayOptions.alliances;
        localStorage.setItem("alliancesEnabled", worldMap.displayOptions.alliances);

        if (worldMap.displayOptions.alliances && !worldMap.userAlliances) {
            ensureAllianceData(exposeAllianceDataForAngular);
        } else {
            $('.alliance-logo').remove();
            // [+] added
            overlayDisplayed = false;
            // <<
        }
    };

    worldMap.getAllianceName = function (userId) {
        if (!worldMap.userAlliance) return "Loading...";

        let userName = worldMap.roomUsers[userId].username;
        let allianceKey = worldMap.userAlliance[userName];
        if (
            !allianceKey || !worldMap.allianceData[currentShard] ||
            !worldMap.allianceData[currentShard][allianceKey]
        ) {
            return "None";
        }

        return worldMap.allianceData[currentShard][allianceKey].name;
    };

    if (alliancesEnabled) {
        ensureAllianceData(exposeAllianceDataForAngular);
        recalculateAllianceOverlay();
    }
}

// insert the alliance toggle into the map container layer
function addAllianceToggle() {
    let content = "\
        <md:button \
            app-stop-click-propagation app-stop-propagation='mouseout mouseover mousemove' \
            class='md-raised btn-units alliance-toggle' ng:class=\"{'md-primary': WorldMap.displayOptions.alliances, 'solitary': WorldMap.zoom !== 3}\" \
            ng:click='WorldMap.toggleAlliances()' \
            tooltip-placement='bottom' tooltip='Toggle alliances'>\
                <span>&#9733;</span>\
        </md:button>";

    addStyle("\
        section.world-map .map-container .btn-units.alliance-toggle { right: 50px; font-size: 16px; padding: 4px; } \
        section.world-map .map-container .btn-units.alliance-toggle.solitary { right: 10px; } \
        section.world-map .map-container .layer-select { right: 90px; } \
    ");

    let mapContainerElem = angular.element($('.map-container'));
    let compiledContent = generateCompiledElement(mapContainerElem, content);
    $(compiledContent).appendTo(mapContainerElem);
}

// Add an "alliance" row to the room info overlay
function addAllianceToInfoOverlay() {
    let content = "\
        <div class='owner' ng:if='WorldMap.displayOptions.alliances && WorldMap.roomStats[MapFloatInfo.float.roomName].own'>\
            <label>Alliance:</label>\
            <span>\
                {{WorldMap.getAllianceName(WorldMap.roomStats[MapFloatInfo.float.roomName].own.user)}}\
            </span>\
        </div>";

    let mapFloatElem = angular.element($('.map-float-info'));
    let compiledContent = generateCompiledElement(mapFloatElem, content);
    $(compiledContent).insertAfter($(mapFloatElem).children('.owner')[0]);
}

function recalculateAllianceOverlay() {
    let mapContainerElem = angular.element(".map-container");
    let scope = mapContainerElem.scope();
    let worldMap = scope.WorldMap;
    if (!worldMap.displayOptions.alliances || !worldMap.allianceData) return;

    function drawRoomAllianceOverlay(roomName, left, top) {
        let roomDiv = $('<div class="alliance-logo" id="' + roomName + '"></div>');
        let roomStats = worldMap.roomStats[roomName];
        if (roomStats && roomStats.own) {
            let userName = worldMap.roomUsers[roomStats.own.user].username;
            let allianceKey = worldMap.userAlliance[userName];
            if (allianceKey) {
                $(roomDiv).addClass('alliance-' + allianceKey);

                $(roomDiv).removeClass("alliance-logo-1 alliance-logo-2 alliance-logo-3");
                $(roomDiv).css('left', left);
                $(roomDiv).css('top', top);
                $(roomDiv).addClass("alliance-logo-" + worldMap.zoom);

                $(mapContainerElem).append(roomDiv);
            }
        }
    }

    let $location = mapContainerElem.injector().get("$location");
    if ($location.search().pos) {
        let roomPixels;
        let roomsPerSectorEdge;
        switch (worldMap.zoom) {
            case 1: { roomPixels = 20;  roomsPerSectorEdge = 10; break; }
            case 2: { roomPixels = 50;  roomsPerSectorEdge =  4; break; }
            case 3: { roomPixels = 150; roomsPerSectorEdge =  1; break; }
        }

        let posStr = $location.search().pos;
        if (!posStr) return;

        //if (worldMap.zoom !== 3) return; // Alliance images are pretty ugly at high zoom.

        for (var u = 0; u < worldMap.sectors.length; u++) {
            let sector = worldMap.sectors[u];
            if (!sector || !sector.pos) continue;

            if (worldMap.zoom === 3) {
                // we're at zoom level 3, only render one room
                drawRoomAllianceOverlay(sector.name, sector.left, sector.top);
            } else if (sector.rooms) {
                // high zoom, render a bunch of rooms
                let rooms = sector.rooms.split(",");
                for (let x = 0; x < roomsPerSectorEdge; x++) {
                    for (let y = 0; y < roomsPerSectorEdge; y++) {
                        let roomName = rooms[x * roomsPerSectorEdge + y];
                        drawRoomAllianceOverlay(
                            roomName,
                            sector.left + x * roomPixels,
                            sector.top + y * roomPixels);
                    }
                }
            }
        }
    }
}

let pendingRedraws = 0;
// [+] added
let lastMapLeft = 0;
let lastMapTop = 0;
let lastZoom = 0;
// <<
function addSectorAllianceOverlay() {
    addStyle("\
        .alliance-logo { position: absolute; z-index: 2; opacity: 0.4 }\
        .alliance-logo-1 { width: 20px; height: 20px; }\
        .alliance-logo-2 { width: 50px; height: 50px; }\
        .alliance-logo-3 { width: 50px; height: 50px; background-size: 50px 50px; opacity: 0.8 }\
    ");

    let mapContainerElem = angular.element(".map-container");
    let scope = mapContainerElem.scope();

    let deferRecalculation = function () {
        // remove alliance logos during redraws
        // $('.alliance-logo').remove(); // [-] removed
        // [+] added
        let deferClear = false;
        
        let worldMap = scope.WorldMap;
        let firstSector = worldMap.sectors[0];
        if (firstSector) {
            if (firstSector.left === lastMapLeft && firstSector.top === lastMapTop && worldMap.zoom === lastZoom) {
                // console.log('deferClear = true');
                deferClear = true;
            }
            lastZoom = worldMap.zoom;
            lastMapLeft = firstSector.left;
            lastMapTop = firstSector.top;
        }
        
        if (overlayDisplayed && !deferClear) {
            // console.log('clear1');
            $('.alliance-logo').remove();
            overlayDisplayed = false;
        }
        // <<

        pendingRedraws++;
        setTimeout(() => {
            pendingRedraws--;
            if (pendingRedraws === 0) {
                // [+] added
                if (overlayDisplayed) {
                    // console.log('clear2');
                    $('.alliance-logo').remove();
                }
                overlayDisplayed = true;
                // <<
                recalculateAllianceOverlay();
            }
        }, 500);
    }
    scope.$on("mapSectorsRecalced", deferRecalculation);
    scope.$on("mapStatsUpdated", deferRecalculation);
    /* scope.$on("mapSectorsRecalced", function() { console.log('mapSectorsRecalced'); deferRecalculation(); });
    scope.$on("mapStatsUpdated", function() { console.log('mapStatsUpdated'); deferRecalculation(); }); */
}

function addAllianceColumnToLeaderboard() {
    function deferredLeaderboardLoad() {
        let leaderboardScope = angular.element('.leaderboard table').scope();
        if (leaderboardScope) {
            let rows = angular.element('.leaderboard table tr')
            let leaderboard = leaderboardScope.$parent.LeaderboardList;

            ensureAllianceData(() => {
                for (let i = 0; i < rows.length; i++) {
                    if (i === 0) {
                        let playerElem = $(rows[i]).children('th:nth-child(2)');
                        $("<th class='alliance-leaderboard'>Alliance</th>").insertAfter(playerElem);
                    } else {
                        let playerElem = $(rows[i]).children('td:nth-child(2)');
                        let userId = leaderboard.list[i - 1].user;
                        let userName = leaderboard.users[userId].username;
                        let allianceKey = userAlliance[userName];
                        let allianceName = (allianceKey && allianceData[currentShard] && allianceData[currentShard][allianceKey]) ? allianceData[currentShard][allianceKey].name : "";
                        
                        $("<td class='alliance-leaderboard'>" + allianceName +" </td>").insertAfter(playerElem);
                    }
                }
            });
        } else {
            setTimeout(deferredLeaderboardLoad, 100);
        }
    }

    setTimeout(deferredLeaderboardLoad, 100);
}

// Entry point
$(document).ready(() => {
    ScreepsAdapter.onViewChange((view) => {
        if (view === "worldMapEntered") {
            ScreepsAdapter.$timeout(()=> {
                bindAllianceSetting();
                addAllianceToggle();
                addAllianceToInfoOverlay();

                addSectorAllianceOverlay();
            });
        }
    });

    ScreepsAdapter.onHashChange((hash) => {
        let match = hash.match(/#!\/map\/shard(\d)/);
        if (match) {
            currentShard = 'shard' + match[1];
        }
        
        match = hash.match(/#!\/(.+?)\//);
        if (match && match.length > 1 && match[1] === "rank") {
            let app = angular.element(document.body);
            let search = app.injector().get("$location").search();
            if (search.page) addAllianceColumnToLeaderboard();
        }
    });
});
