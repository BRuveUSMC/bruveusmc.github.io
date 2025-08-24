'use strict';
/* global Base64, _ */
var CCalc,
	Version = 1.0466,
	MinVersion = 1.035,
	MainJS = '1.791',
	Beta = window.location.href.indexOf('/beta') > -1,
	PriceIncrease = 1.15,
	Fps = 30,
	Abbr = [
		'', '', 'million', 'billion', 'trillion', 'quadrillion',
		'quintillion', 'sextillion', 'septillion', 'octillion',
		'nonillion', 'decillion'
	],
	AbbrMax = Abbr.length - 1;

CCalc = {
	numBuildings: 0,
	Buildings: {},
	BuildingsById: {},
	BuildingsByCat: {},
	buildPriceIndex: 0,
	numUpgrades: 0,
	countedUpgrades: 0,
	Upgrades: {},
	UpgradesById: {},
	upPriceMult: 1,
	specialGrandmaUnlock: 15,
	upLists: {
		kitts: [],
		res: [],
		season: [],
		upPriceRed: [],
		egg: []
	},
	nextResearch: '---',
	nextResearchTime: 0,
	maxResearchTime: Fps * 60 * 30, //30 minutes
	CoveId: 0,
	nextPledgeTime: 0,
	maxPledgeTime: Fps * 60 * 60, //1 hour
	numAchieves: 0,
	Achieves: {},
	AchievesById: {},
	numMilkAchs: 0,
	maxMilkAchs: 0,
	cpsAchs: [],
	total: {},
	chips: 0,
	cookiesDesired: 0,
	get milk() { return this.numMilkAchs / 25; },
	sepRgx: /(\d+)(\d{3})/,
	descRgx: /([\d\,]{4,})/g,
	maxSeasonTime: Fps * 60 * 60 * 24, // 1 day
	defaultSeason: '',
	seasonBasePrice: 11111111111,
	backgroundType: -1,
	milkType: -1,
	santaNames: [
		'Festive test tube', 'Festive ornament', 'Festive wreath',
		'Festive tree', 'Festive present', 'Festive elf fetus',
		'Elf toddler', 'Elfling', 'Young elf', 'Bulky elf', 'Nick',
		'Santa Claus', 'Elder Santa', 'True Santa', 'Final Claus'
	],
	santaMax: 15,
	focusing: false,
	setThirdParty: true,
	abbrOn: false,
	changedBakeryName: false,
	reCalc: 0,
	calcTime: _.now(),
	cache: {
		inputVals: {},
		buildPrices: {}
	},
	optSaveOrder: [
		'#optParticles', '#optNumbers','#optAutosave', '#optOffline',
		'#optMilk', '#optFancyGraph', '#optCloseWarn',
		'#optCursors', '#optFocus', '#optShortNumbers', '#optFastNotes'
	]
};
CCalc.lastSeason = CCalc.defaultSeason;
CCalc.santaMax = CCalc.santaNames.length;

$('#pVersion').text(Version + (Beta ? ' beta' : ''))[0].title = 'main.js?v=' + MainJS;

//Orteil's helper functions:
function choose(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function utf8_to_b64(str) {
	try {
		return Base64.encode(unescape(encodeURIComponent(str)));
	} catch(err) {
		//alert('There was a problem while encrypting to base64.<br>(' + err + ')');
		return '';
	}
}
function b64_to_utf8(str) {
	try {
		return decodeURIComponent(escape(Base64.decode(str)));
	} catch(err) {
		alert('There was a problem while decrypting from base64.<br>(' + err + ')');
		return '';
	}
}
//compress a sequence like [0,1,1,0,1,0]... into a number like 54.
function compressBin(arr) {
	var i,
		str = '',
		arr2 = arr.slice(0);
	arr2.unshift(1);
	arr2.push(1);
	arr2.reverse();
	for (i in arr2) { str += arr2[i]; }
	str = parseInt(str, 2);
	return str;
}
//uncompress a number like 54 to a sequence like [0,1,1,0,1,0].
function uncompressBin(num) {
	var arr = num.toString(2);
	arr = arr.split('');
	arr.reverse();
	arr.shift();
	arr.pop();
	return arr;
}
//we have to compress in smaller chunks to avoid getting into scientific notation
function compressLargeBin(arr) {
	var arr2 = arr.slice(0);
	var i,
		thisBit = [],
		bits = [];
	for (i in arr2) {
		thisBit.push(arr2[i]);
		if (thisBit.length >= 50) {
			bits.push(compressBin(thisBit));
			thisBit = [];
		}
	}
	if (thisBit.length > 0) { bits.push(compressBin(thisBit)); }
	arr2 = bits.join(';');
	return arr2;
}
function uncompressLargeBin(arr) {
	var i,
		ii,
		arr2 = arr.split(';'),
		bits = [];
	for (i in arr2) { bits.push(uncompressBin(parseInt(arr2[i], 10))); }
	arr2 = [];
	for (i in bits) { for (ii in bits[i]) { arr2.push(bits[i][ii]); } }
	return arr2;
}
function randomBakeryName() {
	return (Math.random() > 0.05 ?
		choose(['Magic', 'Fantastic', 'Fancy', 'Sassy', 'Snazzy', 'Pretty', 'Cute',
			'Pirate', 'Ninja', 'Zombie', 'Robot', 'Radical', 'Urban', 'Cool', 'Hella',
			'Sweet', 'Awful', 'Double', 'Triple', 'Turbo', 'Techno', 'Disco',
			'Electro', 'Dancing', 'Wonder', 'Mutant', 'Space', 'Science', 'Medieval',
			'Future', 'Captain', 'Bearded', 'Lovely', 'Tiny', 'Big', 'Fire', 'Water',
			'Frozen', 'Metal', 'Plastic', 'Solid', 'Liquid', 'Moldy', 'Shiny',
			'Happy', 'Slimy', 'Tasty', 'Delicious', 'Hungry', 'Greedy', 'Lethal',
			'Professor', 'Doctor', 'Power', 'Chocolate', 'Crumbly', 'Choklit',
			'Righteous', 'Glorious', 'Mnemonic', 'Psychic', 'Frenetic', 'Hectic',
			'Crazy', 'Royal', 'El', 'Von']) + ' ' : 'Mc') +
		choose(['Cookie', 'Biscuit', 'Muffin', 'Scone', 'Cupcake', 'Pancake',
			'Chip', 'Sprocket', 'Gizmo', 'Puppet', 'Mitten', 'Sock', 'Teapot',
			'Mystery', 'Baker', 'Cook', 'Grandma', 'Click', 'Clicker', 'Spaceship',
			'Factory', 'Portal', 'Machine', 'Experiment', 'Monster', 'Panic',
			'Burglar', 'Bandit', 'Booty', 'Potato', 'Pizza', 'Burger', 'Sausage',
			'Meatball', 'Spaghetti', 'Macaroni', 'Kitten', 'Puppy', 'Giraffe',
			'Zebra', 'Parrot', 'Dolphin', 'Duckling', 'Sloth', 'Turtle', 'Goblin',
			'Pixie', 'Gnome', 'Computer', 'Pirate', 'Ninja', 'Zombie', 'Robot']);
}

//Add Commas http://www.mredkj.com/javascript/numberFormat.html
function addCommas(x) {
	var rgx = CCalc.sepRgx;
	x = x.toString().split('.');
	while (rgx.test(x[0])) { x[0] = x[0].replace(rgx, '$1' + ',' + '$2'); }
	return x.join('.');
}
function formatNumber(num, floats) {
	var beaut = beautify(num, floats),
		abbr = abbreviateNumber(num, floats),
		c = CCalc.abbrOn,
		str = '<span title="' + (c ? beaut : abbr) + '">' +
			(c ? abbr : beaut) + '</span>';
	return beaut === abbr ? beaut : str;
}
function beautify(what, floats) { //turns 9999999 into 9,999,999
	if (what === '---') { return what; }
	if (!isFinite(what)) { return 'Infinity'; }
	if (what.toString().indexOf('e') !== -1) { return what.toString(); }
	var rgx = CCalc.sepRgx;
	floats = floats > 0 ? Math.pow(10, floats) : 1;
	what = Math.round(what * floats) / floats;
	what = what.toString().split('.');
	while(rgx.test(what[0])) {
		what[0] = what[0].replace(rgx,'$1' + ',' + '$2');
	}
	return what.join('.');
}
function beautifyAbbr(what, floats) {
	return CCalc.abbrOn ? abbreviateNumber(what, floats) : beautify(what, floats);
}
//abbreviates numbers
function abbreviateNumber(num, floats) {
	if (num === '---') { return num; }
	if (!isFinite(num)) { return 'Infinity'; }
	if (Math.abs(num) < 1e+6) { return beautify(num, floats); }
	num = Number(num).toExponential().split('e+');
	var pow = Math.floor(num[1] / 3);
	if (pow > AbbrMax) {
		num[0] = Math.round(num[0] * 1000) / 1000;
		return num.join('e+');
	}
	num[0] *= Math.pow(10, num[1] % 3);
	num[0] = Math.round(num[0] * 1000) / 1000;
	if (num[0] >= 1000 && pow < AbbrMax) {
		pow += 1;
		num[0] /= 1000;
	} else {
		num[0] = addCommas(num[0]);
	}
	num[1] = Abbr[Math.min(pow, AbbrMax)];
	return num.join(' ');
}
function setShort() {
	var fn = function () { this.setTitle(); };
	$('.exp').each(fn);
	$.each(CCalc.Upgrades, fn);
	$.each(CCalc.Achieves, fn);
	calcEdit();
}
function cleanDescription(desc) {
	return [
			desc.replace(CCalc.descRgx,
				function (m) { return beautify(cleanNum(m)); }),
			desc.replace(CCalc.descRgx,
				function (m) { return abbreviateNumber(cleanNum(m), 0, true); })
		];
}
function setDescriptions() {
	var fn = function () {
		if (CCalc.descRgx.text(this.baseDesc)) {
			var desc = cleanDescription(this.baseDesc);
			this.desc = desc[0];
			this.descShort = desc[1];
			this.setTitle();
		}
	};
	$.each(CCalc.Upgrades, fn);
	$.each(CCalc.Achieves, fn);
}
function isundef(t) { return typeof t === 'undefined'; }
function parseIn(ele) {
	var num;
	if (ele) {
		num = parseNum(ele.value);
		num = Math.max(num, ele.minIn || 0);
		if (ele.maxIn) { num = Math.min(num, ele.maxIn); }
		if (!$(ele).hasClass('deci')) { num = Math.floor(num); }
	}
	return num || 0;
}
function cleanNum(str) { return str.replace(/[^\deE\+\.]/g, ''); }
function parseNum(num) {
	if (typeof num === 'string') { num = parseFloat(cleanNum(num)); }
	return Number(num) || 0;
}
function setIn(ele, val) {
	ele = $(ele)[0];
	val = Math.max(parseNum(val), ele.minIn || 0);
	if (ele.maxIn) { val = Math.min(val, ele.maxIn); }
	if (!$(ele).hasClass('deci')) { val = Math.floor(val); }
	if ($(ele).hasClass('exp')) {
		ele.value = addCommas(val);
		ele.setTitle(val);
	} else {
		ele.value = val;
		if (ele.buildInAll) {
			setIn(ele.buildInAll, Math.max(parseIn(ele.buildInAll), val));
		}
	}
	CCalc.cache.inputVals[ele.id] = val;
}
function getIn(ele) { return CCalc.cache.inputVals[ele.id || ele]; }
//checks input values with parse function and stores them
//runs calcEdit() if they've changed.
function checkInVal(ele) {
	ele = $(ele)[0];
	var id = ele.id,
		num = parseIn(ele),
		call = ele.checkfn || calcEdit;
	if (id === 'cookiesBaked') { num = getCookBaked(); }
	if (CCalc.cache.inputVals[id] !== num) {
		CCalc.cache.inputVals[id] = num;
		if (ele.setTitle) { ele.setTitle(num); }
		call();
	}
}
function setUpLock(id, tog) {
	if (CCalc.Upgrades.hasOwnProperty(id)) { id = CCalc.Upgrades[id].id; }
	var u = CCalc.UpgradesById[id];
	tog = $(u.upIcon).toggleClass('unlocked', tog).hasClass('unlocked');
	u.unlocked = tog;
	if (u.debug) {
		condShow('#upgradeDebugBlock', tog ||
			$('#upgradeDebug .crate.enabled, .crate.unlocked').length);
	}
	return tog;
}
function setUp(id, tog) {
	if (CCalc.Upgrades.hasOwnProperty(id)) { id = CCalc.Upgrades[id].id; }
	var u = CCalc.UpgradesById[id],
		tmp = u.owned;
	tog = $(u.upIcon).toggleClass('enabled', tog).hasClass('enabled');
	u.owned = tog;

	if (u.owned !== tmp) {
		if (u.name === 'A festive hat' && tog && !$('#santaLevel')[0].selectedIndex) {
			$('#santaLevel')[0].options[1].selected = true;
		}
		if (u.debug) {
			condShow('#upgradeDebugBlock', tog ||
				$('#upgradeDebug')[0].querySelector('.crate.enabled, .crate.unlocked'));
		}
		if (u.name === 'Sacrificial rolling pins') {
			CCalc.nextPledgeTime = Fps * 60 * 30 * (1 + tog);
		}

		//sets index for building.getPrice()
		if (u.buildPriceRed) {
			CCalc.buildPriceIndex = 0;
			if (hasUp('Season savings')) { CCalc.buildPriceIndex++; }
			if (hasUp('Santa\'s dominion')) { CCalc.buildPriceIndex++; }
			if (hasUp('Faberge egg')) { CCalc.buildPriceIndex++; }
		}

		//sets upgrade price reduction multiplier
		if (u.upPriceRed) {
			CCalc.upPriceMult = 1;
			if (hasUp('Toy workshop')) { CCalc.upPriceMult *= 0.95; }
			if (hasUp('Santa\'s dominion')) { CCalc.upPriceMult *= 0.98; }
			if (hasUp('Faberge egg')) { CCalc.upPriceMult *= 0.99; }
		}

		if (u.name === 'Perfect idling') { condShow('#idleGain', tog); }
	}

	return tog;
}
function setAch(id, tog) {
	if (CCalc.Achieves.hasOwnProperty(id)) { id = CCalc.Achieves[id].id; }
	var a = CCalc.AchievesById[id];
	tog = $(a.achIcon).toggleClass('enabled', tog).hasClass('enabled');
	a.owned = tog;
	return tog;
}
function hide(ele) { $(ele).addClass('hidden'); }
function show(ele) { $(ele).removeClass('hidden'); }
function condShow(ele, cond) { $(ele).toggleClass('hidden', !cond); }
function hasUp(index) {
	if (CCalc.Upgrades.hasOwnProperty(index)) {
		return CCalc.Upgrades[index].owned;
	}
	if (CCalc.UpgradesById.hasOwnProperty(index)) {
		return CCalc.UpgradesById[index].owned;
	}
	//console.log('Upgrade \'' + index + '\' not found');
	return false;
}
function getCookBaked() { return Math.floor(getIn('cookiesEarned')); }
function getGoldClicks() {
	return Math.max(getIn('goldClicks'), getIn('goldClicksAll'));
}
function getNumResets() {
	return Math.max(getIn('numResets'), Boolean(getIn('cookiesReset')));
}
function checkEventAltMode(e) { //checks event for keys for alt mode
	return e.shiftKey || e.ctrlKey || e.altKey || e.metaKey;
}
//calc building's cookies per second
function calcBuildCps(base, add, mult, bonus) {
	return (base + add) * Math.pow(2, mult) + (bonus || 0);
}

//calculate the different prices an upgrade can have because of price reduction upgrades
/*function calcUpPrices(price) {
	return [price, Math.ceil(price * 0.95),
		Math.ceil(price * 0.98), Math.ceil(price * 0.95 * 0.98)];
}*/

function setSeasonPrices() {
	$.each(CCalc.upLists.season, function () { this.setPrice(); });
	$('#nextSeason').html(formatNumber(CCalc.upLists.season[0].price));
}

function setUpPrices() {
	$.each(CCalc.UpgradesById, function () { this.setPrice(); });
	$('#nextSeason').html(formatNumber(CCalc.upLists.season[0].price));
}

function setBuildingNames() {
	var c = $('#foolsNameCheck')[0].checked ? 'foolsName' : 'name';
	$.each(CCalc.BuildingsById, function (i, b) {
		$('#build' + i + 'Name').text(b[c]);
	});
}

function popWrinklers() {
	var w = $('#numWrinklersSel')[0],
		cook = w.selectedIndex ? getIn('cooksMunchedSaved') : 0;
	if (cook) {
		cook /= w.selectedIndex;
		cook = w.selectedIndex *
			Math.floor(1.1 * cook * (hasUp('Wrinklerspawn') ? 1.05 : 1));
		setIn('#cookiesBank', getIn('cookiesBank') + cook);
		setIn('#cookiesEarned', getIn('cookiesEarned') + cook);
		setIn('#wrinklersPopped', getIn('wrinklersPopped') + w.selectedIndex);
		w.options[0].selected = true;
		setIn('#cooksMunchedSaved', 0);
	}
}

function calcEdit() {
	clearTimeout(CCalc.reCalc);
	CCalc.calcTime = _.now();
	var i,
		j,
		k = 0,
		ele,
		numw = $('#numWrinklersSel')[0],
		cook = getIn('cookiesEarned'),
		bingo = hasUp('Bingo center/Research facility'),
		mind = hasUp('One mind'),
		hasCove = hasUp(CCalc.CoveId),
		pact = hasUp('Elder Pact') && !hasCove,
		season = $('#seasonSel')[0],
		rcook = getIn('cookiesReset'),
		setDisabled = function (ele, cond) {
			ele = $(ele)[0];
			if (!ele.disClick) { ele.disabled = cond; }
		};

	CCalc.total = {
		count: 0,
		upCount: 0,
		achCount: 0,
		minCumu: 0,
		baseCps: 0,
		cps: 0,
		achs: [],
		missCheat: Math.max(getIn('cookiesBank') - cook, 0),
		missCumu: 0
	};
	CCalc.numMilkAchs = 0;
	condShow('#offVerse', getIn('versionIn') != Version);

	setDisabled('#wrinklersPopped', !mind);
	setDisabled('#cooksMunchedAll', !mind);
	i = !mind || hasCove || getIn('pledgeTime');
	setDisabled(numw, i);
	condShow('#warnWrinklers', numw.selectedIndex && i);
	condShow('#popWrinklers', numw.selectedIndex);
	setDisabled('#cooksMunchedSaved', !numw.selectedIndex || i);
	i = numw.selectedIndex ? getIn('cooksMunchedSaved') : 0;
	if (i) {
		i /= numw.selectedIndex;
		i = numw.selectedIndex *
			Math.floor(i * 1.1 * (hasUp('Wrinklerspawn') ? 1.05 : 1));
	}
	condShow('#cooksMunchedAdd', i);
	i = '+' + beautifyAbbr(i);
	$('#cooksMunched')[0].title = i;
	$('#popWrinklers')[0].title = i;

	CCalc.chips = Math.max(0,
		Math.floor((Math.sqrt(1 + Math.floor(rcook) / 1.25e+11) - 1) / 2));
	$('#chipsReset').text('(' + addCommas(CCalc.chips) + ' chip' +
		(CCalc.chips === 1 ? '' : 's') + ')');
	$('#chipsCurrent').text(addCommas(CCalc.chips));

	i = cook + rcook;
	$('#cookiesAllTime').html(formatNumber(i));
	j = Math.max(0,
		Math.floor((Math.sqrt(1 + Math.floor(i) / 1.25e+11) - 1) / 2));
	k = Math.max(j - CCalc.chips, 0);
	$('#chipsResetGain')
		.html(formatNumber(k) + ' chip' + (k === 1 ? '' : 's'));
	$('#chipsResetGain')[0].title = j ? beautifyAbbr(j) +
		' chip' + (j === 1 ? '' : 's') + ' total' : '';

	var hat = hasUp('A festive hat'),
		s = $('#santaLevel')[0];
	setDisabled(s, !hat);
	if (!hat) { s.options[0].selected = true; }
	s = s.selectedIndex;
	$('#santaPrice')
		.html(formatNumber(Math.pow(s, s)));
	$('#nextSanta').text(CCalc.santaNames[s.selectedIndex]);
	condShow('#santaClick', s && s < CCalc.santaMax);

	//toggle disabled on season inputs if you have season switcher
	k = hasUp('Eternal seasons');
	j = !hasUp('Season switcher') && !k;
	setDisabled('#seasonTime', j);
	condShow('#seasonTimeClick', (!season.selectedIndex &&
		getIn('seasonTime')) || (getIn('seasonTime') < CCalc.maxSeasonTime &&
		season.value !== CCalc.defaultSeason));
	$('#seasonTimeClick')[0].title = !season.selectedIndex ?
		'Click to set to 0.' : 'Click to set time to the max ' +
		beautify(CCalc.maxSeasonTime) + ' frames.';
	$('#seasonTimeCell')[0].title = Fps + ' fps' + (j ? '' :
		', max ' + addCommas(CCalc.maxSeasonTime));
	setDisabled('#seasonCount', j);
	setDisabled(season, j);
	condShow('#seasonSet', season.value !== CCalc.lastSeason);

	$.each(CCalc.BuildingsById, function (i, b) {
		b.count = getIn(b.buildIn);
		CCalc.total.count += b.count;
		b.price = b.getPrice();
		for (k = 0; k < b.count; k++) { CCalc.total.minCumu += b.getPrice(k); }
		$('#build' + i + 'Price').html(formatNumber(b.price));
	});

	var neuro = hasUp('Neuromancy'), //show all debugs if you have it
		showEnAll = false,
		showLockAll = false,
		showUnlockAll = false,
		mult = 1;
	$.each(CCalc.UpgradesById, function (i, u) {
		if (!u.unlocked && u.req()) { setUpLock(i, true); }
		if (u.owned) {
			if (!u.hidden && i != CCalc.CoveId) {
				if (!u.debug) { CCalc.total.upCount += 1; }
				CCalc.total.minCumu += u.price;
			}
			if (u.plus) { mult += u.plus; }
		} else if (!showLockAll && u.unlocked && !u.req()) {
			showLockAll = true;
		}
		if (u.debug) {
			condShow(u.upIcon, u.unlocked || u.owned || neuro);
		} else {
			if (!u.hidden && !u.owned) {
				if (!showEnAll && i != CCalc.CoveId) { showEnAll = true; }
				if (!showUnlockAll && !u.unlocked) { showUnlockAll = true; }
			}
		}
	});
	if (hasUp('Santa\'s legacy')) { mult += 0.1 * s; }
	var hmult = 0;
	if (CCalc.chips > 0) {
		if (hasUp('Heavenly chip secret')) { hmult += 0.05; }
		if (hasUp('Heavenly cookie stand')) { hmult += 0.20; }
		if (hasUp('Heavenly bakery')) { hmult += 0.25; }
		if (hasUp('Heavenly confectionery')) { hmult += 0.25; }
		if (hasUp('Heavenly key')) { hmult += 0.25; }
	}
	mult += 0.02 * hmult * CCalc.chips;
	$('#numUpgrades').text(CCalc.total.upCount + ' / ' + CCalc.countedUpgrades + ' (' +
		Math.round(CCalc.total.upCount / CCalc.countedUpgrades * 100) + '%)');
	condShow('#upgradeDisableAll', CCalc.total.upCount > 0 || hasCove);
	condShow('#upgradeLockAll', showLockAll);
	condShow('#upgradeEnableAll', showEnAll);
	condShow('#upgradeUnlockAll', showUnlockAll);

	j = CCalc.upLists.season[0];
	k = getIn('seasonCount');
	for (i = 0; i < k; i++) { CCalc.total.minCumu += j.getPrice(k); }

	$('#researchTimeCell')[0].title = Fps + ' fps' +
		(bingo ? ', max ' + addCommas(CCalc.maxResearchTime) : '');
	CCalc.nextResearch = '---';
	if (bingo) {
		j = CCalc.upLists.res;
		k = j.length - 1;
		for (i = 0; i < k; i++) {
			if (j[i] && j[i + 1] && !j[i + 1].owned) {
				if (j[i + 1].unlocked) { break; }
				CCalc.nextResearch = j[i + 1].name;
				break;
			}
		}
	}
	$('#researchClick').html(CCalc.nextResearch);
	j = $('#researchTime')[0];
	k = CCalc.nextResearch === '---';
	condShow('#research', k);
	condShow('#researchClick', !k);
	setDisabled(j, k);
	if (k) { setIn(j, 0); }
	CCalc.nextResearchTime = Fps * 60 * 30;
	if (hasUp('Persistent memory')) { CCalc.nextResearchTime /= 10;}
	if (hasUp('Ultrascience')) { CCalc.nextResearchTime = Fps * 5; }
	condShow('#researchTimeClick', !k && CCalc.nextResearchTime !== getIn(j));

	ele = $('#numPledges')[0];
	j = CCalc.Upgrades['Elder Pledge'];
	k = getIn(ele);
	for (i = 0; i < k; i++) { CCalc.total.minCumu += j.getPrice(k); }
	$('#pledgePrice').html(formatNumber(j.price));
	$('#pledgeTimeCell')[0].title = Fps + ' fps' +
		(pact ? ', max ' + addCommas(CCalc.maxPledgeTime) : '');
	i = $('#pledgeTime')[0];
	setDisabled(i, !pact);
	setDisabled(ele, !pact);
	if (i.disabled) {
		setIn(i, 0);
		if (hasCove) { i.value = '∞'; }
	} else if (i.value === '∞') {
		i.value = 0;
	}
	i = getIn(i);
	$('#pledgeClickText').text(i === 0 ? 'Pledge' : 'Reset time');
	condShow('#pledgeClick', pact && (i !== CCalc.nextPledgeTime));
	condShow('#pledgeClickIcon', pact && i === 0);

	ele = $('#wrathSel')[0];
	condShow(ele.options[1], mind);
	k = mind && hasUp('Communal brainsweep');
	condShow(ele.options[2], k);
	condShow(ele.options[3], k && pact);
	mind = !mind || hasCove;
	setDisabled(ele, mind || i > 0);
	if (mind) { ele.options[0].selected = true; }

	CCalc.total.missCumu = Math.max(CCalc.total.minCumu - cook, 0);
	$('#missCheat').html(formatNumber(CCalc.total.missCheat) + ' cookie' +
		(CCalc.total.missCheat === 1 ? '' : 's'));
	condShow('#missCheatSpan', CCalc.total.missCheat > 0);
	$('#missCumu').html(formatNumber(CCalc.total.missCumu) + ' cookie' +
		(CCalc.total.missCumu === 1 ? '' : 's'));
	condShow('#missCumuSpan', CCalc.total.missCumu > 0);
	condShow('#missBreak', CCalc.total.missCheat > 0 && CCalc.total.missCumu > 0);
	condShow('#missRow', CCalc.total.missCheat > 0 || CCalc.total.missCumu > 0);

	//since this is a third party tool...
	if (CCalc.setThirdParty && !CCalc.Achieves['Third-party'].owned) {
		setAch('Third-party', true);
	}
	var sumAchs = CCalc.maxMilkAchs;
	$.each(CCalc.AchievesById, function () {
		var check = !this.owned && this.req();
		$(this.achIcon).toggleClass('unlocked', check);
		if (check) { CCalc.total.achs.push(this.name); }
		if (this.owned) {
			CCalc.total.achCount++;
			if (!this.shadow) {
				CCalc.numMilkAchs++;
				sumAchs++;
			}
		}
	});
	$('#numAch').text(CCalc.total.achCount + ' / ' + sumAchs +
		' (' + Math.round(CCalc.total.achCount / sumAchs * 100) + '%)');
	condShow('#achEnableAll', CCalc.total.achCount < CCalc.numAchieves);
	condShow('#achDisableAll', CCalc.total.achCount > 0);

	$.each(CCalc.BuildingsById, function () {
		this.cps = this.count * this.calc();
		CCalc.total.baseCps += this.cps;
	});
	if (hasUp('"egg"')) { CCalc.total.baseCps += 9; } //"egg"
	var milk = CCalc.milk,
		milkMult = hasUp('Santa\'s milk and cookies') ? 1.05 : 1;
	if (hasUp('Kitten helpers')) { mult *= 1 + milk * 0.05 * milkMult; }
	if (hasUp('Kitten workers')) { mult *= 1 + milk * 0.1 * milkMult; }
	if (hasUp('Kitten engineers')) { mult *= 1 + milk * 0.2 * milkMult; }
	if (hasUp('Kitten overseers')) { mult *= 1 + milk * 0.2 * milkMult; }
	if (hasUp('Kitten managers')) { mult *= 1 + milk * 0.2 * milkMult; }

	var eggMult = 0;
	if (hasUp('Chicken egg')){ eggMult++; }
	if (hasUp('Duck egg')){ eggMult++; }
	if (hasUp('Turkey egg')){ eggMult++; }
	if (hasUp('Quail egg')){ eggMult++; }
	if (hasUp('Robin egg')){ eggMult++; }
	if (hasUp('Ostrich egg')){ eggMult++; }
	if (hasUp('Cassowary egg')){ eggMult++; }
	if (hasUp('Salmon roe')){ eggMult++; }
	if (hasUp('Frogspawn')){ eggMult++; }
	if (hasUp('Shark egg')){ eggMult++; }
	if (hasUp('Turtle egg')){ eggMult++; }
	if (hasUp('Ant larva')){ eggMult++; }
	if (hasUp('Century egg')) {
		//the boost increases a little every day, with diminishing returns up to +10% on the 100th day
		var day = Math.floor((CCalc.calcTime - getIn('sessionStartTime')) /
			1000 / 10) * 10 / 60 / 60 / 24;
		day = Math.min(day, 100);
		eggMult += (1 - Math.pow(1 - day / 100, 3)) * 10;
	}
	mult *= (1 + 0.01 * eggMult);

	if (hasCove) { mult *= 0.95; }
	if (hasUp('Golden switch')) { mult *= 1.25; }
	CCalc.total.cps = CCalc.total.baseCps * mult;
	$('#cookiesPerSecond').html(formatNumber(CCalc.total.cps, 1));

	$.each(CCalc.cpsAchs, function () {
		var a = CCalc.Achieves[this],
			check = !a.owned && a.req();
		$(a.achIcon).toggleClass('unlocked', check);
		if (check) { CCalc.total.achs.push(a.name); }
	});

	var a = CCalc.total.achs.length;
	condShow('#achAward', a > 0);
	CCalc.total.achs.sort(function (a, b) {
		return CCalc.Achieves[a].order - CCalc.Achieves[b].order;
	});
	$('#warnAch').text(a + ' achievement' + (a === 1 ? '' : 's'));
	ele = $('#warnAchSpan')[0];
	ele.title = CCalc.total.achs.join('\n');
	condShow(ele, a > 0);

	k = Math.max(CCalc.total.missCheat, CCalc.total.missCumu);
	$('#warnCooks').html(formatNumber(k) + ' cookie' + (k === 1 ? '' : 's'));
	condShow('#warnCheat', !CCalc.Achieves['Cheated cookies taste awful'].owned &&
		CCalc.total.missCheat > 0);
	condShow('#warnCooksSpan', k > 0);
	j = !$('#warnWrinklers').hasClass('hidden');
	condShow('#warnBreak1', k > 0 && a > 0);
	condShow('#warnBreak2', j && (k > 0 || a > 0));
	condShow('#warnSpan', k > 0 || a > 0 || j);

	$.each(CCalc.upLists.kitts, function () {
		if (!this.unlocked && this.req()) { setUpLock(this.id, true); }
	});
	var type = 'plain milk';
	if (milk >= 4) { type = 'caramel milk'; }
	else if (milk >= 3) { type = 'orange juice'; }
	else if (milk >= 2) { type = 'raspberry milk'; }
	else if (milk >= 1) { type = 'chocolate milk'; }
	$('#achMilk').text(Math.round(milk * 100) + '% (' + type + ')');

	i = getIn('chipsDesired');
	j = i * (i + 1) * 5e+11; //cookies needed
	k = Math.max(j - getIn('cookiesReset'), 0);
	CCalc.cookiesDesired = j;
	$('#chipsDesCooks').html('+' + formatNumber(k) + ' cookie' +
		(k === 1 ? '' : 's'))[0].title = beautifyAbbr(j) + ' total cookies';
	condShow('#chipsDesCooksSpan', k);

	exportSave();

	var check = hasUp('Century egg') && CCalc.total.cps &&
		(CCalc.calcTime - getIn('sessionStartTime')) / 1000 / 60 / 60 / 24 < 100;
	if (check) {
		CCalc.reCalc = setTimeout(calcEdit, 1000 * 10); //10 seconds
	}
	condShow('#recalcButton', check);
}

function exportSave() {
	if ($('#lastSavedCheck')[0].checked) {
		setIn('#lastSavedTime', _.now());
	}
	var numw = $('#numWrinklersSel')[0].selectedIndex,
		warnedw = !$('#warnWrinklers').hasClass('hidden'),
		goldClicksAll = getGoldClicks(),
		numResets = getNumResets(),
		pledgeTime = getIn('pledgeTime'),
		hasCove = hasUp(CCalc.CoveId),
		nextRes = CCalc.Upgrades.hasOwnProperty(CCalc.nextResearch),
		s = $('#seasonSel')[0],
		season = hasUp('Season switcher'),
		str = Math.max(getIn('versionIn'), 1.035) + '||';

	str += //save stats
		(getIn('sessionStartTime') || 'NaN') + ';' +
		(getIn('saveCreationTime') || 'NaN') + ';' +
		(getIn('lastSavedTime') || 'NaN') + ';' +
		$('#bakeryName')[0].value.replace(/\W/g, ' ') + '|';

	//game prefs
	$.each(CCalc.optSaveOrder,
		function () { str += Number($(this).hasClass('on')); });
	str += '|';

	str += //cookies
		getIn('cookiesBank') + ';' +
		getIn('cookiesEarned') + ';' +
		getIn('cookieClicks') + ';' +
		goldClicksAll + ';' +
		getIn('cookiesHandmade') + ';' +
		getIn('goldMiss') + ';' +
		Math.floor(parseNum(CCalc.backgroundType)) + ';' +
		Math.floor(parseNum(CCalc.milkType)) + ';' +
		getIn('cookiesReset') + ';' +
		(pledgeTime === 0 && !hasCove ?
			$('#wrathSel')[0].selectedIndex : '0') + ';' +
		getIn('numPledges') + ';' +
		pledgeTime + ';' +
		(nextRes ? CCalc.Upgrades[CCalc.nextResearch].id : 0) + ';' +
		(nextRes ? Math.max(getIn('researchTime'), 1) : 0) + ';' +
		numResets + ';' +
		(numResets > 0 ? getIn('goldClicks') : goldClicksAll) + ';' +
		getIn('cooksMunchedAll') + ';' +
		getIn('wrinklersPopped') + ';' +
		Math.max($('#santaLevel')[0].selectedIndex - 1, 0) + ';' +
		getIn('reinClicks') + ';' +
		(s.value ? getIn('seasonTime') : 0) + ';' +
		getIn('seasonCount') + ';' +
		s.value + ';' +
		(numw && !warnedw ? getIn('cooksMunchedSaved') : 0) + ';' +
		(warnedw ? 0 : numw) + ';' +
		'|';

	//buildings
	$.each(CCalc.BuildingsById, function () { //buildings
		var count = getIn(this.buildIn);
		str += count + ',' +
			Math.max(getIn(this.buildInAll), count) + ',' +
			getIn(this.buildBaked) + ',' +
			0 + ';'; //Number(this.buildSpec.checked) (dungeons break current version)
	});
	str += '|';

	//upgrades
	str += compressLargeBin($.map(CCalc.Upgrades, function (u) {
		if (u.name === 'Elder Pledge') {
			if (pledgeTime) {
				return [1, 1];
			} else {
				return [Number(hasUp('Elder Pact') && !hasCove), 0];
			}
		} else if (u.name === 'Revoke Elder Covenant' && hasCove) {
			return [1, 0];
		} else if (u.season) {
			return [season || hasUp('Eternal seasons') ?
				Number(s.value !== u.season) : 0, 0];
		} else {
			return [Number(u.owned || u.unlocked), Number(u.owned)];
		}
	})) + '|';

	//achievements
	str += compressLargeBin($.map(CCalc.Achieves,
		function (a) { return Number(a.owned); }));

	str = escape(utf8_to_b64(str) + '!END!');
	$('#exportField')[0].value = str;
}

function importSave() {
	var season = $('#seasonSel')[0],
		parseBool = function (n) { return Boolean(parseNum(n)); },
		spl,
		verse = 0,
		str = $('#importField')[0].value.replace(/\s/g, '');
	if (!str) { return; }

	str = b64_to_utf8(unescape(str).split('!END!')[0]);
	if (!str) { return; }
	str = str.split('|');
	verse = parseFloat(str[0]);
	setIn('#versionIn', verse);

	spl = str[2].split(';'); //save stats
	setIn('#sessionStartTime', spl[0]);
	setIn('#saveCreationTime', spl[1]);
	setIn('#lastSavedTime', spl[2]);
	$('#bakeryName')[0].value = spl[3] || '';

	spl = str[3].split(''); //prefs
	$.each(CCalc.optSaveOrder,
		function (i, opt) { $(opt).toggleClass('on', parseBool(spl[i])); });

	spl = str[4].split(';'); //cookies
	setIn('#cookiesBank', spl[0]);
	setIn('#cookiesEarned', spl[1]);
	setIn('#cookieClicks', spl[2]);
	setIn('#goldClicksAll', spl[3]);
	setIn('#cookiesHandmade', spl[4]);
	setIn('#goldMiss', spl[5]);
	CCalc.backgroundType = spl[6];
	CCalc.milkType = spl[7];
	setIn('#cookiesReset', spl[8]);
	$('#wrathSel')[0].options[parseNum(spl[9])].selected = true;
	setIn('#numPledges', spl[10]);
	setIn('#pledgeTime', spl[11]);
	setIn('#researchTime', spl[13]);
	setIn('#numResets', spl[14]);
	setIn('#goldClicks', spl[15]);
	setIn('#cooksMunchedAll', spl[16]);
	setIn('#wrinklersPopped', spl[17]);
	$('#santaLevel')[0].options[parseNum(spl[18]) + 1].selected = true;
	setIn('#reinClicks', spl[19]);
	setIn('#seasonTime', spl[20]);
	setIn('#seasonCount', spl[21]);
	var s = $('#seasonSel [value="' +
		(spl[22] || CCalc.defaultSeason) + '"]')[0];
	if (s) {
		s.selected = true;
	} else {
		$('#seasonSel [value="' + CCalc.defaultSeason + '"]')[0].selected = true;
	}
	CCalc.lastSeason = season.value;
	$('#foolsNameCheck')[0].checked = season.value === 'fools';
	setIn('#cooksMunchedSaved', spl[23]);
	$('#numWrinklersSel')[0].options[parseNum(spl[24])].selected = true;

	spl = str[5].split(';'); //buildings
	$.each(CCalc.BuildingsById, function (i, b) {
		spl[i] = spl[i] ? spl[i].split(',') : [0,0,0,0];
		//b.buildSpec.checked = parseBool(spl[i][3]);
		setIn(b.buildBaked, spl[i][2]);
		setIn(b.buildInAll, spl[i][1]);
		setIn(b.buildIn, spl[i][0]);
	});

	if (verse < 1.035) { //old non-binary algorithm
		spl = str[6].split(';'); //upgrades
		$.each(CCalc.UpgradesById, function (i, u) {
			if (spl[i]) {
				spl[i] = spl[i].split(',');
				setUp(i, u.season ? false : parseBool(spl[i][1]));
				setUpLock(i, parseBool(spl[i][0]));
			} else {
				setUp(i, false);
				setUpLock(i, false);
			}
		});
		spl = str[7].split(';'); //achievements
		$.each(CCalc.AchievesById, function (i) { setAch(i, parseBool(spl[i])); });
	} else {
		spl = uncompressLargeBin(str[6] || []); //upgrades
		$.each(CCalc.UpgradesById, function (i, u) {
			if (spl[i * 2]) {
				setUp(i, u.season ? false : parseBool(spl[i * 2 + 1]));
				setUpLock(i, parseBool(spl[i * 2]));
			} else {
				setUp(i, false);
				setUpLock(i, false);
			}
		});
		spl = uncompressLargeBin(str[7] || []); //achievements
		$.each(CCalc.AchievesById, function (i) { setAch(i, parseBool(spl[i])); });
	}

	CCalc.changedBakeryName = false;
	setBuildingNames();
	setUpPrices();
	calcEdit();
}