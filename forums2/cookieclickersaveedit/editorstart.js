'use strict';
$(document).ready(setTimeout(function () {
	document.forms[0].reset();
	if (localStorage.CCalcAbbreviateNums) {
		$('#abbrCheck')[0].checked = true;
		CCalc.abbrOn = true;
	}

	//automatic season detection (might not be 100% accurate)
	var day = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) /
		(1000 * 60 * 60 * 24));
	if (day >= 41 && day <= 46) {
		CCalc.defaultSeason = 'valentines';
	} else if (day>=90 && day<=92) {
		CCalc.defaultSeason = 'fools';
	} else if (day>=304-7 && day<=304) {
		CCalc.defaultSeason = 'halloween';
	} else if (day>=349 && day<=365) {
		CCalc.defaultSeason = 'christmas';
	} else {
		//easter is a pain goddamn
		var easterDay = function (Y) {
			var C = Math.floor(Y / 100),
				N = Y - 19 * Math.floor(Y / 19),
				K = Math.floor((C - 17) / 25),
				I = C - Math.floor(C / 4) - Math.floor((C - K) / 3) + 19 * N + 15;
			I = I - 30 * Math.floor((I / 30));
			I = I - Math.floor(I / 28) * (1 - Math.floor(I / 28) *
				Math.floor(29 / (I + 1)) * Math.floor((21 - N) / 11));
			var J = Y + Math.floor(Y / 4) + I + 2 - C + Math.floor(C / 4);
			J = J - 7 * Math.floor(J / 7);
			var L = I - J,
				M = 3 + Math.floor((L + 40) / 44),
				D = L + 28 - 31 * Math.floor(M / 4);
			return new Date(Y, M-1, D);
		}(new Date().getFullYear());
		easterDay = Math.floor((easterDay - new Date(easterDay.getFullYear(), 0, 0)) /
			(1000 * 60 * 60 * 24));
		if (day >= easterDay - 7 && day <= easterDay) { CCalc.defaultSeason = 'easter'; }
	}
	CCalc.lastSeason = CCalc.defaultSeason;
	$('#seasonSel').val(CCalc.lastSeason).find(':selected').addClass('currOption');

	var i,
		eventfn,
		last,
		order = 0,
		tier1 = 10,
		tier2 = 100,
		tier3 = 1000,
		tier4 = 50000,
		tier5 = 1000000,
		tier6 = 8000000000,
		//adds input with -/+ buttons that subtract/add when clicked
		//-/+ 1 or 10, depending on radios, with alt mode reversing
		addPlusMinus = function (par, id, maxlen) {
			$(par).html('<a id="' + id + 'M" class="minus plusminus">-</a>' +
				' <input id="' + id + '"' + (maxlen ? ' maxlength="' +
				maxlen + '"' : '') + '> <a id="' + id + 'P" class="plus plusminus">+</a>');
			var ele = par.children[1],
				pm = par.children[0];
			pm.pmIn = ele;
			pm.pmMode = -1;
			pm = par.children[2];
			pm.pmIn = ele;
			pm.pmMode = 1;
			return ele;
		},
		inBlur = function () { this.value = getIn(this); },
		inTitleExp = function (val) {
			this.title = CCalc.abbrOn ? abbreviateNumber(val || getIn(this)) : '';
		},
		disClick = function (e) {
			if (checkEventAltMode(e) && this.disabled && this.value !== '∞') {
				this.disabled = false;
				this.disClick = true;
				this.focus();
				e.preventDefault();
			}
		},
		disBlur = function () {
			if (this.disClick) {
				this.disabled = true;
				this.disClick = false;
			}
		},
		sortFn = function (a, b) { return a.order - b.order; },

		Building = function (name, foolsName, cat, price, calccps) {
			var b = CCalc.numBuildings,
				tr,
				id;
			this.id = b;
			this.name = name;
			this.foolsName = foolsName;
			this.basePrice = price;
			this.price = 0;
			this.prices = {};
			CCalc.cache.buildPrices[b] = {};
			this.cps = 0;
			this.count = 0;
			this.calc = calccps;

			CCalc.Buildings[name] = this;
			CCalc.BuildingsById[b] = this;
			CCalc.BuildingsByCat[cat] = this;
			CCalc.numBuildings++;

			tr = $('#buildTable')[0].children[1].insertRow(-1);
			tr.id = 'build' + b;
			id = tr.id;
			$(tr).html('<td id="' + id + 'Name">' +
				(CCalc.defaultSeason === 'fools' ? foolsName : name) +
				'</td><td></td><td></td><td><input id="' + id +
				'baked" class="exp"></td><td class="spec hidden">' +
				'<input id="' + id + 'spec" type="checkbox"></td>' +
				'<td id="' + id + 'Price">0</td>');

			ele = addPlusMinus(tr.children[1], id + 'In', 4);
			ele2 = addPlusMinus(tr.children[2], id + 'InAll', 4);
			ele.buildInAll = ele2;
			ele2.buildIn = ele;
			$(ele).on('blur', inBlur);
			ele.checkfn = function () {
				var v = getIn(this);
				if (v > getIn(this.buildInAll)) { setIn(this.buildInAll, v); }
				calcEdit();
			}.bind(ele);
			$(ele2).on('blur', function () {
				this.value = Math.max(getIn(this.buildIn), getIn(this));
			});
			ele2.checkfn = function () {
				var v = getIn(this.buildIn);
				if (v > getIn(this) && document.activeElement !== this) {
					setIn(this, v);
				}
				calcEdit();
			}.bind(ele2);
			this.buildIn = ele;
			this.buildInAll = ele2;
			this.buildBaked = $('#' + id + 'baked')[0];
			this.buildSpec = $('#' + id + 'spec')[0];

			last = this;
			return this;
		},

		buildReq = function (count) {
			return function () { return this.build.count >= count; };
		},
		milkReq = function (milk) {
			return function () { return CCalc.milk >= milk; };
		},
		cooksReq = function (cooks) {
			return function () { return getCookBaked() >= cooks; };
		},
		cooksChipsReq = function (cooks, chips) {
			return function () {
				return getCookBaked() >= cooks && CCalc.chips >= chips;
			};
		},
		clicksReq = function (cooks) {
			return  function () { return getIn('cookiesHandmade') >= cooks; };
		},
		gmTypeReq = function (cat) {
			return function () {
				return CCalc.Buildings.Grandma.count &&
					CCalc.BuildingsByCat[cat].count >= CCalc.specialGrandmaUnlock;
			};
		},
		eggReq = function (egg) {
			return function () {
				var i,
					c = 0,
					eggs = CCalc.upLists.egg;
				for (i = 0; i < eggs.length; i++) {
					c += eggs[i].owned || eggs[i].unlocked;
					if (c >= egg) { return true; }
				}
				return false;
			};
		},

		upEles = [],
		Upgrade = function (name, desc, price, icon, cat, req) {
			var u = CCalc.numUpgrades,
				d = cleanDescription(desc);
			this.id = u;
			this.name = name;
			this.baseDesc = desc;
			this.desc = d[0];
			this.descShort = d[1];
			this.basePrice = price;
			this.price = price;
			this.icon = icon;
			this.unlocked = false;
			this.owned = false;
			this.order = order ? order + 0.001 * u : u;
			if (cat) {
				this.cat = cat;
				cat = cat.split(' ');
				for (var i = 0; i < cat.length; i++) {
					var c = cat[i].split(':');
					this[c[0]] = c[1] || true;
					if (!isNaN(c[1])) { this[c[0]] = Number(c[1]); }
					if (CCalc.BuildingsByCat[c[0]]) {
						this.build = CCalc.BuildingsByCat[c[0]];
						req = req || buildReq(this[c[0]]);
					}
					if (CCalc.upLists[c[0]]) { CCalc.upLists[c[0]].push(this); }
				}
			}

			if (this.plus) { this.plus /= 100; }
			CCalc.Upgrades[name] = this;
			CCalc.UpgradesById[u] = this;
			CCalc.numUpgrades++;

			ele = $('<div id="upgrade' + u + '" class="crate" title="' +
				name + '&#10;' + d[Number(CCalc.abbrOn)] +
				'&#10;Price: ' + beautifyAbbr(price) + '" style="background-position: ' +
				(6 - icon[0] * 48) + 'px ' + (6 - icon[1] * 48) + 'px;"></div>')[0];
			ele.upObj = this;
			this.upIcon = ele;
			if (this.hidden) { hide(ele); }
			if (!this.hidden && !this.debug) { CCalc.countedUpgrades++; }
			if (this.kitt) { req = req || milkReq(this.kitt); }

			if (typeof req === 'function') {
				this.req = req;
			} else {
				this.req = function () { return false; };
			}
			upEles.push(this);
			last = this;
			return this;
		},

		achEles = [],
		achs,
		Achieve = function (name, desc, icon, req, shadow) {
			var a = CCalc.numAchieves,
				d = cleanDescription(desc);
			this.id = a;
			this.name = name;
			this.baseDesc = desc;
			this.desc = d[0];
			this.descShort = d[1];
			this.icon = icon;
			this.owned = false;
			this.order = order ? order + 0.001 * a : a;
			if (typeof req === 'string') {
				var c = req.split(':');
				if (CCalc.BuildingsByCat[c[0]] && c[1]) {
					this.build = CCalc.BuildingsByCat[c[0]];
					req = buildReq(Number(c[1]));
				}
			}
			if (typeof req === 'function') {
				this.req = req;
			} else {
				this.req = function () {
					return false;
				};
			}
			if (shadow) {
				this.shadow = true;
			} else {
				CCalc.maxMilkAchs++;
			}
			CCalc.Achieves[name] = this;
			CCalc.AchievesById[a] = this;
			CCalc.numAchieves++;

			ele = $('<div id="ach' + a + '" class="crate" title="' + name +
				'&#10;' + d[Number(CCalc.abbrOn)] + '" style="background-position: ' +
				(6 - icon[0] * 48) + 'px ' + (6 - icon[1] * 48) + 'px;"></div>')[0];
			ele.achId = a;
			this.achIcon = ele;
			achEles.push(this);
			last = this;
			return this;
		};

	Building.prototype.getPrice = function (count, index) {
		if (isNaN(count)) { count = this.count; }
		if (isNaN(index)) { index = CCalc.buildPriceIndex; }
		var c = CCalc.cache.buildPrices[this.id][count],
			p;
		if (!c) {
			p = this.basePrice * Math.pow(PriceIncrease, count);
			c = [Math.ceil(p), Math.ceil(p * 0.99),
				Math.ceil(p * 0.99 * 0.99), Math.ceil(p * 0.99 * 0.99 * 0.99)];
		}
		return c[index];
	};
	Upgrade.prototype.getPrice = function (arg) {
		return Math.ceil(CCalc.upPriceMult *
			(this.priceFn ? this.priceFn(arg) : this.basePrice));
	};
	Upgrade.prototype.setPrice = function () {
		this.price = this.getPrice();
		this.setTitle();
	};
	Upgrade.prototype.setTitle = function () {
		var c = CCalc.abbrOn;
		this.upIcon.title = this.name + '\n' +
			(c ? this.descShort : this.desc) + '\nPrice: ' +
			beautifyAbbr(this.price);
	};
	Achieve.prototype.setTitle = function () {
		this.achIcon.title = this.name + '\n' +
			(CCalc.abbrOn ? this.descShort : this.desc);
	};

	new Building('Cursor', 'Rolling pin', 'curs', 15, function () {
			var add = 0;
			if (hasUp('Thousand fingers')) { add += 0.1; }
			if (hasUp('Million fingers')) { add += 0.5; }
			if (hasUp('Billion fingers')) { add += 2; }
			if (hasUp('Trillion fingers')) { add += 10; }
			if (hasUp('Quadrillion fingers')) { add += 20; }
			if (hasUp('Quintillion fingers')) { add += 100; }
			if (hasUp('Sextillion fingers')) { add += 200; }
			if (hasUp('Septillion fingers')) { add += 400; }
			if (hasUp('Octillion fingers')) { add += 800; }
			add *= CCalc.total.count - CCalc.Buildings.Cursor.count;
			return calcBuildCps(0.1, hasUp('Reinforced index finger') * 0.1,
				hasUp('Carpal tunnel prevention cream') + hasUp('Ambidextrous'), add);
		});
	new Building('Grandma', 'Oven', 'gma', 100, function () {
			var mult = 0,
				add = 0;
			if (hasUp('Farmer grandmas')) { mult++; }
			if (hasUp('Worker grandmas')) { mult++; }
			if (hasUp('Miner grandmas')) { mult++; }
			if (hasUp('Cosmic grandmas')) { mult++; }
			if (hasUp('Transmuted grandmas')) { mult++; }
			if (hasUp('Altered grandmas')) { mult++; }
			if (hasUp('Grandmas\' grandmas')) { mult++; }
			if (hasUp('Antigrandmas')) { mult++; }
			if (hasUp('Rainbow grandmas')) { mult++; }
			if (hasUp('Bingo center/Research facility')) { mult += 2; }
			if (hasUp('Ritual rolling pins')) { mult++; }
			if (hasUp('Naughty list')) { mult++; }
			if (hasUp('One mind')) { add += CCalc.Buildings.Grandma.count * 0.02; }
			if (hasUp('Communal brainsweep')) {
				add += CCalc.Buildings.Grandma.count * 0.02;
			}
			if (hasUp('Elder Pact')) { add += CCalc.Buildings.Portal.count * 0.05; }
			return calcBuildCps(0.5, hasUp('Forwards from grandma') * 0.3 + add,
				hasUp('Steel-plated rolling pins') + hasUp('Lubricated dentures') +
				hasUp('Prune juice') + hasUp('Double-thick glasses') +
				hasUp('Aging agents') + mult);
		});
	new Building('Farm', 'Kitchen', 'farm', 500, function () {
			return calcBuildCps(4, hasUp('Cheap hoes'),
				hasUp('Fertilizer') + hasUp('Cookie trees') +
				hasUp('Genetically-modified cookies') +
				hasUp('Gingerbread scarecrows') + hasUp('Pulsar sprinklers'));
		});
	new Building('Factory', 'Factory', 'fact', 3000, function () {
			return calcBuildCps(10,
				hasUp('Sturdier conveyor belts') * 4,
				hasUp('Child labor') + hasUp('Sweatshop') + hasUp('Radium reactors') +
				hasUp('Recombobulators') + hasUp('Deep-bake process'));
		}, 'fact');
	new Building('Mine', 'Secret recipe', 'mine', 10000, function () {
			return calcBuildCps(40, hasUp('Sugar gas') * 10,
				hasUp('Megadrill') + hasUp('Ultradrill') + hasUp('Ultimadrill') +
				hasUp('H-bomb mining') + hasUp('Coreforge'));
		});
	new Building('Shipment', 'Supermarket', 'ship', 40000, function () {
			return calcBuildCps(100, hasUp('Vanilla nebulae') * 30,
				hasUp('Wormholes') + hasUp('Frequent flyer') + hasUp('Warp drive') +
				hasUp('Chocolate monoliths') + hasUp('Generation ship'));
		});
	new Building('Alchemy lab', 'Stock share', 'alab', 200000, function () {
			return calcBuildCps(400, hasUp('Antimony') * 100,
				hasUp('Essence of dough') + hasUp('True chocolate') +
				hasUp('Ambrosia') + hasUp('Aqua crustulae') +
				hasUp('Origin crucible'));
		});
	new Building('Portal', 'TV show', 'port', 1666666, function () {
			return calcBuildCps(6666, hasUp('Ancient tablet') * 1666,
				hasUp('Insane oatling workers') + hasUp('Soul bond') +
				hasUp('Sanity dance') + hasUp('Brane transplant') +
				hasUp('Deity-sized portals'));
		});
	new Building('Time machine', 'Theme park', 'tmach', 123456789, function () {
			return calcBuildCps(98765, hasUp('Flux capacitors') * 9876,
				hasUp('Time paradox resolver') + hasUp('Quantum conundrum') +
				hasUp('Causality enforcer') + hasUp('Yestermorrow comparators') +
				hasUp('Far future enactment'));
		});
	new Building('Antimatter condenser', 'Cookiecoin', 'anti', 3999999999,
		function () {
			return calcBuildCps(999999, hasUp('Sugar bosons') * 99999,
				hasUp('String theory') + hasUp('Large macaron collider') +
				hasUp('Big bang bake') + hasUp('Reverse cyclotrons') +
				hasUp('Nanocosmics'));
		});
	new Building('Prism', 'Corporate country', 'prism', 75000000000, function () {
		return calcBuildCps(10000000, hasUp('Gem polish') * 1000000,
			hasUp('9th color') + hasUp('Chocolate light') +
			hasUp('Grainbow') + hasUp('Pure cosmic light') +
			hasUp('Glow-in-the-dark'));
		});

	order = 100;
	new Upgrade('Reinforced index finger',
		'The mouse gains +1 cookie per click.\nCursors gain +0.1 base CpS.',
		100, [0,0], 'curs:1');
	new Upgrade('Carpal tunnel prevention cream',
		'The mouse and cursors are twice as efficient.',
		400, [0, 0], 'curs:1');
	new Upgrade('Ambidextrous', 'The mouse and cursors are twice as efficient.',
		10000, [0, 6], 'curs:10');
	new Upgrade('Thousand fingers',
		'The mouse and cursors gain +0.1 cookies for each non-cursor object owned.',
		500000, [1, 6], 'curs:20');
	new Upgrade('Million fingers',
		'The mouse and cursors gain +0.5 cookies for each non-cursor object owned.',
		50000000, [2, 6], 'curs:40');
	new Upgrade('Billion fingers',
		'The mouse and cursors gain +2 cookies for each non-cursor object owned.',
		500000000, [2, 6], 'curs:80');
	new Upgrade('Trillion fingers',
		'The mouse and cursors gain +10 cookies for each non-cursor object owned.',
		5000000000, [3, 6], 'curs:120');
	order = 200;
	new Upgrade('Forwards from grandma', 'Grandmas gain +0.3 base CpS.',
		CCalc.Buildings.Grandma.basePrice * tier1, [1, 0], 'gma:1');
	new Upgrade('Steel-plated rolling pins', 'Grandmas are twice as efficient.',
		CCalc.Buildings.Grandma.basePrice * tier2, [1, 0], 'gma:1');
	new Upgrade('Lubricated dentures', 'Grandmas are twice as efficient.',
		CCalc.Buildings.Grandma.basePrice * tier3, [1, 1], 'gma:10');
	order = 300;
	new Upgrade('Cheap hoes', 'Farms gain +1 base CpS.',
		CCalc.Buildings.Farm.basePrice * tier1, [2, 0], 'farm:1');
	new Upgrade('Fertilizer', 'Farms are twice as efficient.',
		CCalc.Buildings.Farm.basePrice * tier2, [2, 0], 'farm:1');
	new Upgrade('Cookie trees', 'Farms are twice as efficient.',
		CCalc.Buildings.Farm.basePrice * tier3, [2, 1], 'farm:10');
	order = 400;
	new Upgrade('Sturdier conveyor belts', 'Factories gain +4 base CpS.',
		CCalc.Buildings.Factory.basePrice * tier1, [4, 0], 'fact:1');
	new Upgrade('Child labor', 'Factories are twice as efficient.',
		CCalc.Buildings.Factory.basePrice * tier2, [4, 0], 'fact:1');
	new Upgrade('Sweatshop', 'Factories are twice as efficient.',
		CCalc.Buildings.Factory.basePrice * tier3, [4, 1], 'fact:10');
	order = 500;
	new Upgrade('Sugar gas', 'Mines gain +10 base CpS.',
		CCalc.Buildings.Mine.basePrice * tier1, [3, 0], 'mine:1');
	new Upgrade('Megadrill', 'Mines are twice as efficient.',
		CCalc.Buildings.Mine.basePrice * tier2, [3, 0], 'mine:1');
	new Upgrade('Ultradrill', 'Mines are twice as efficient.',
		CCalc.Buildings.Mine.basePrice * tier3, [3, 1], 'mine:10');
	order = 600;
	new Upgrade('Vanilla nebulae', 'Shipments gain +30 base CpS.',
		CCalc.Buildings.Shipment.basePrice * tier1, [5, 0], 'ship:1');
	new Upgrade('Wormholes', 'Shipments are twice as efficient.',
		CCalc.Buildings.Shipment.basePrice * tier2, [5, 0], 'ship:1');
	new Upgrade('Frequent flyer', 'Shipments are twice as efficient.',
		CCalc.Buildings.Shipment.basePrice * tier3, [5, 1], 'ship:10');
	order = 700;
	new Upgrade('Antimony', 'Alchemy labs gain +100 base CpS.',
		CCalc.Buildings['Alchemy lab'].basePrice * tier1, [6, 0], 'alab:1');
	new Upgrade('Essence of dough', 'Alchemy labs are twice as efficient.',
		CCalc.Buildings['Alchemy lab'].basePrice * tier2, [6, 0], 'alab:1');
	new Upgrade('True chocolate', 'Alchemy labs are twice as efficient.',
		CCalc.Buildings['Alchemy lab'].basePrice * tier3, [6, 1], 'alab:10');
	order = 800;
	new Upgrade('Ancient tablet', 'Portals gain +1,666 base CpS.',
		CCalc.Buildings.Portal.basePrice * tier1, [7, 0], 'port:1');
	new Upgrade('Insane oatling workers', 'Portals are twice as efficient.',
		CCalc.Buildings.Portal.basePrice * tier2, [7, 0], 'port:1');
	new Upgrade('Soul bond', 'Portals are twice as efficient.',
		CCalc.Buildings.Portal.basePrice * tier3, [7, 1], 'port:10');
	order = 900;
	new Upgrade('Flux capacitors', 'Time machines gain +9,876 base CpS.',
		1234567890, [8, 0], 'tmach:1');
	new Upgrade('Time paradox resolver', 'Time machines are twice as efficient.',
		9876543210, [8, 0], 'tmach:1');
	new Upgrade('Quantum conundrum', 'Time machines are twice as efficient.',
		98765456789, [8, 1], 'tmach:10');
	order = 20000;
	new Upgrade('Kitten helpers', 'You gain more CpS the more milk you have.',
		9000000, [1, 7], 'kitt:0.5');
	new Upgrade('Kitten workers', 'You gain more CpS the more milk you have.',
		9000000000, [2, 7], 'kitt:1');
	order = 10000;
	new Upgrade('Oatmeal raisin cookies', 'Cookie production multiplier +5%.',
		99999999, [0, 3], 'cook plus:5', cooksReq(9999999));
	new Upgrade('Peanut butter cookies', 'Cookie production multiplier +5%.',
		99999999, [1, 3], 'cook plus:5', cooksReq(9999999));
	new Upgrade('Plain cookies', 'Cookie production multiplier +5%.',
		99999999, [2, 3], 'cook plus:5', cooksReq(9999999));
	order = 10010;
	new Upgrade('Coconut cookies', 'Cookie production multiplier +5%.',
		999999999, [3, 3], 'cook plus:5', cooksReq(99999999));
	new Upgrade('White chocolate cookies', 'Cookie production multiplier +5%.',
		999999999, [4, 3], 'cook plus:5', cooksReq(99999999));
	new Upgrade('Macadamia nut cookies', 'Cookie production multiplier +5%.',
		999999999, [5, 3], 'cook plus:5', cooksReq(99999999));
	new Upgrade('Double-chip cookies', 'Cookie production multiplier +10%.',
		99999999999, [6, 3], 'cook plus:10', cooksReq(999999999));
	order = 10000;
	new Upgrade('Sugar cookies', 'Cookie production multiplier +5%.',
		99999999, [7, 3], 'cook plus:5', cooksReq(9999999));
	order = 10020;
	new Upgrade('White chocolate macadamia nut cookies',
		'Cookie production multiplier +10%.',
		99999999999, [8, 3], 'cook plus:10', cooksReq(999999999));
	new Upgrade('All-chocolate cookies', 'Cookie production multiplier +10%.',
		99999999999, [9, 3], 'cook plus:10', cooksReq(999999999));
	order = 100;
	new Upgrade('Quadrillion fingers',
		'The mouse and cursors gain +20 cookies for each non-cursor object owned.',
		50000000000, [3, 6], 'curs:160');
	order = 200;
	new Upgrade('Prune juice', 'Grandmas are twice as efficient.',
		CCalc.Buildings.Grandma.basePrice * tier4, [1, 2], 'gma:50');
	order = 300;
	new Upgrade('Genetically-modified cookies', 'Farms are twice as efficient.',
		CCalc.Buildings.Farm.basePrice * tier4, [2, 2], 'farm:50');
	order = 400;
	new Upgrade('Radium reactors', 'Factories are twice as efficient.',
		CCalc.Buildings.Factory.basePrice * tier4, [4, 2], 'fact:50');
	order = 500;
	new Upgrade('Ultimadrill', 'Mines are twice as efficient.',
		CCalc.Buildings.Mine.basePrice * tier4, [3, 2], 'mine:50');
	order = 600;
	new Upgrade('Warp drive', 'Shipments are twice as efficient.',
		CCalc.Buildings.Shipment.basePrice * tier4, [5, 2], 'ship:50');
	order = 700;
	new Upgrade('Ambrosia', 'Alchemy labs are twice as efficient.',
		CCalc.Buildings['Alchemy lab'].basePrice * tier4, [6, 2], 'alab:50');
	order = 800;
	new Upgrade('Sanity dance', 'Portals are twice as efficient.',
		CCalc.Buildings.Portal.basePrice * tier4, [7, 2], 'port:50');
	order = 900;
	new Upgrade('Causality enforcer', 'Time machines are twice as efficient.',
		1234567890000, [8, 2], 'tmach:50');
	order = 5000;
	new Upgrade('Lucky day',
		'Golden cookies appear twice as often and stay twice as long.',
		777777777, [10, 1], false,
		function () { return getGoldClicks() >= 7 && getIn('goldClicks'); });
	new Upgrade('Serendipity',
		'Golden cookies appear twice as often and stay twice as long.',
		77777777777, [10, 1], false,
		function () { return getGoldClicks() >= 27 && getIn('goldClicks'); });
	order = 20000;
	new Upgrade('Kitten engineers', 'You gain more CpS the more milk you have.',
		90000000000000, [3, 7], 'kitt:2');
	order = 10000;
	new Upgrade('Dark chocolate-coated cookies',
		'Cookie production multiplier +15%.',
		999999999999, [10, 3], 'cook plus:15', cooksReq(9999999999));
	new Upgrade('White chocolate-coated cookies',
		'Cookie production multiplier +15%.',
		999999999999, [11, 3], 'cook plus:15', cooksReq(9999999999));
	order = 250;
	new Upgrade('Farmer grandmas', 'Grandmas are twice as efficient.',
		CCalc.Buildings.Farm.basePrice * tier2, [10, 9], false, gmTypeReq('farm'));
	new Upgrade('Worker grandmas', 'Grandmas are twice as efficient.',
		CCalc.Buildings.Factory.basePrice * tier2,
		[10, 9], false, gmTypeReq('fact'));
	new Upgrade('Miner grandmas', 'Grandmas are twice as efficient.',
		CCalc.Buildings.Mine.basePrice * tier2, [10, 9], false, gmTypeReq('mine'));
	new Upgrade('Cosmic grandmas', 'Grandmas are twice as efficient.',
		CCalc.Buildings.Shipment.basePrice * tier2,
		[10, 9], false, gmTypeReq('ship'));
	new Upgrade('Transmuted grandmas', 'Grandmas are twice as efficient.',
		CCalc.Buildings['Alchemy lab'].basePrice * tier2,
		[10, 9], false, gmTypeReq('alab'));
	new Upgrade('Altered grandmas', 'Grandmas are twice as efficient.',
		CCalc.Buildings.Portal.basePrice * tier2,
		[10, 9], false, gmTypeReq('port'));
	new Upgrade('Grandmas\' grandmas', 'Grandmas are twice as efficient.',
		CCalc.Buildings['Time machine'].basePrice * tier2,
		[10, 9], false, gmTypeReq('tmach'));
	order = 14000;
	new Upgrade('Bingo center/Research facility',
		'Grandma-operated science lab and leisure club.\nGrandmas are 4 times as efficient.\nRegularly unlocks new upgrades.',
		100000000000, [11, 9], 'res',
		function () { return CCalc.Achieves.Elder.owned; });
	order = 15000;
	new Upgrade('Specialized chocolate chips',
		'Cookie production multiplier +1%.',
		10000000000, [0, 9], 'res plus:1');
	new Upgrade('Designer cocoa beans', 'Cookie production multiplier +2%.',
		20000000000, [1, 9], 'res plus:2');
	new Upgrade('Ritual rolling pins', 'Grandmas are twice as efficient.',
		40000000000, [2, 9], 'res');
	new Upgrade('Underworld ovens', 'Cookie production multiplier +3%.',
		80000000000, [3, 9], 'res plus:3');
	new Upgrade('One mind',
		'Each grandma gains +1 base CpS for every 50 grandmas.',
		160000000000, [4, 9], 'res');
	new Upgrade('Exotic nuts', 'Cookie production multiplier +4%.',
		320000000000, [5, 9], 'res plus:4');
	new Upgrade('Communal brainsweep',
		'Each grandma gains another +1 base CpS for every 50 grandmas.',
		640000000000, [6, 9], 'res');
	new Upgrade('Arcane sugar', 'Cookie production multiplier +5%.',
		1280000000000, [7, 9], 'res plus:5');
	new Upgrade('Elder Pact',
		'Each grandma gains +1 base CpS for every 20 portals.',
		2560000000000, [8, 9], 'res');
	new Upgrade('Elder Pledge',
		'Contains the wrath of the elders, at least for a while.',
		1, [9, 9], false, 'hidden');
	last.priceFn = function (num) {
		if (isNaN(num)) { num = getIn('numPledges') || 0; }
		return Math.pow(8, Math.min(num + 2, 14));
	};
	last.setPrice();
	order = 150;
	new Upgrade('Plastic mouse', 'Clicking gains +1% of your CpS.',
		50000, [11, 0], false, clicksReq(1000));
	new Upgrade('Iron mouse', 'Clicking gains +1% of your CpS.',
		5000000, [11, 0], false, clicksReq(100000));
	new Upgrade('Titanium mouse', 'Clicking gains +1% of your CpS.',
		500000000, [11, 1], false, clicksReq(10000000));
	new Upgrade('Adamantium mouse', 'Clicking gains +1% of your CpS.',
		50000000000, [11, 2], false, clicksReq(1000000000));
	order = 40000;
	new Upgrade('Ultrascience', 'Research takes only 5 seconds.',
		7, [9, 2], 'debug'); //debug purposes only
	order = 10020;
	new Upgrade('Eclipse cookies', 'Cookie production multiplier +15%.',
		9999999999999, [0, 4], 'cook plus:15', cooksReq(99999999999));
	new Upgrade('Zebra cookies', 'Cookie production multiplier +15%.',
		9999999999999, [1, 4], 'cook plus:15', cooksReq(99999999999));
	order = 100;
	new Upgrade('Quintillion fingers',
		'The mouse and cursors gain +100 cookies for each non-cursor object owned.',
		50000000000000, [12, 13], 'curs:200');
	order = 40000;
	new Upgrade('Gold hoard', 'Golden cookies appear really often.',
		7, [10, 1], 'debug'); //debug purposes only
	order = 15000;
	CCalc.CoveId = new Upgrade('Elder Covenant',
		'Puts a permanent end to the elders\' wrath, at the price of 5% of your CpS.',
		66666666666666, [8, 9], false,
		function () { return getIn('numPledges') > 0; }
	).id;
	new Upgrade('Revoke Elder Covenant',
		'You will get 5% of your CpS back, but the grandmatriarchs will return.',
		6666666666, [8, 9], 'hidden');
	order = 5000;
	new Upgrade('Get lucky', 'Golden cookie effects last twice as long.',
		77777777777777, [10, 1], false,
		function () { return getGoldClicks() >= 77 && getIn('goldClicks'); });
	order = 15000;
	new Upgrade('Sacrificial rolling pins', 'Elder pledge last twice as long.',
		2888888888888, [2, 9], false,
		function () { return getIn('numPledges') >= 10; });
	order = 10020;
	new Upgrade('Snickerdoodles', 'Cookie production multiplier +15%.',
		99999999999999, [2, 4], 'cook plus:15', cooksReq(999999999999));
	new Upgrade('Stroopwafels', 'Cookie production multiplier +15%.',
		99999999999999, [3, 4], 'cook plus:15', cooksReq(999999999999));
	new Upgrade('Macaroons', 'Cookie production multiplier +15%.',
		99999999999999, [4, 4], 'cook plus:15', cooksReq(999999999999));
	order = 40000;
	new Upgrade('Neuromancy',
		'Can toggle upgrades on and off at will in the stats menu.',
		7, [4, 9], 'debug'); //debug purposes only
	order = 10020;
	new Upgrade('Empire biscuits', 'Cookie production multiplier +15%.',
		99999999999999, [5, 4], 'cook plus:15', function () {
			return getCookBaked() >= 999999999999 &&
				hasUp('Snickerdoodles') && hasUp('Stroopwafels') && hasUp('Macaroons');
		});
	new Upgrade('British tea biscuits', 'Cookie production multiplier +15%.',
		99999999999999, [6, 4], 'cook plus:15', function () {
			return getCookBaked() >= 999999999999 && hasUp('Empire biscuits');
		});
	new Upgrade('Chocolate british tea biscuits',
		'Cookie production multiplier +15%.',
		99999999999999, [7, 4], 'cook plus:15', function () {
			return getCookBaked() >= 999999999999 && hasUp('British tea biscuits');
		});
	new Upgrade('Round british tea biscuits',
		'Cookie production multiplier +15%.',
		99999999999999, [8, 4], 'cook plus:15', function () {
			return getCookBaked() >= 999999999999 &&
				hasUp('Chocolate british tea biscuits');
		});
	new Upgrade('Round chocolate british tea biscuits',
		'Cookie production multiplier +15%.',
		99999999999999, [9, 4], 'cook plus:15', function () {
			return getCookBaked() >= 999999999999 &&
				hasUp('Round british tea biscuits');
		});
	new Upgrade('Round british tea biscuits with heart motif',
		'Cookie production multiplier +15%.',
		99999999999999, [10, 4], 'cook plus:15', function () {
			return getCookBaked() >= 999999999999 &&
				hasUp('Round chocolate british tea biscuits');
		});
	new Upgrade('Round chocolate british tea biscuits with heart motif',
		'Cookie production multiplier +15%.',
		99999999999999, [11, 4], 'cook plus:15', function () {
			return getCookBaked() >= 999999999999 &&
				hasUp('Round british tea biscuits with heart motif');
		});
	order = 1000;
	new Upgrade('Sugar bosons', 'Antimatter condensers gain +99,999 base CpS.',
		CCalc.Buildings['Antimatter condenser'].basePrice * tier1, [13, 0], 'anti:1');
	new Upgrade('String theory', 'Antimatter condensers are twice as efficient.',
		CCalc.Buildings['Antimatter condenser'].basePrice * tier2, [13, 0], 'anti:1');
	new Upgrade('Large macaron collider',
		'Antimatter condensers are twice as efficient.',
		CCalc.Buildings['Antimatter condenser'].basePrice * tier3, [13, 1], 'anti:10');
	new Upgrade('Big bang bake', 'Antimatter condensers are twice as efficient.',
		CCalc.Buildings['Antimatter condenser'].basePrice * tier4, [13, 2], 'anti:50');
	order = 250;
	new Upgrade('Antigrandmas', 'Grandmas are twice as efficient.',
		CCalc.Buildings['Antimatter condenser'].basePrice * tier2,
		[10, 9], false, gmTypeReq('anti'));
	order = 10020;
	new Upgrade('Madeleines', 'Cookie production multiplier +20%.',
		199999999999999, [12, 3], 'cook plus:20', cooksReq(9999999999999));
	new Upgrade('Palmiers', 'Cookie production multiplier +20%.',
		199999999999999, [13, 3], 'cook plus:20', cooksReq(9999999999999));
	new Upgrade('Palets', 'Cookie production multiplier +20%.',
		199999999999999, [12, 4], 'cook plus:20', cooksReq(9999999999999));
	new Upgrade('Sablés', 'Cookie production multiplier +20%.',
		199999999999999, [13, 4], 'cook plus:20', cooksReq(9999999999999));
	order = 20000;
	new Upgrade('Kitten overseers', 'You gain more CpS the more milk you have.',
		90000000000000000, [8, 7], 'kitt:3');
	order = 100;
	new Upgrade('Sextillion fingers',
		'The mouse and cursors gain +200 cookies for each non-cursor object owned.',
		500000000000000, [12, 13], 'curs:240');
	order = 200;
	new Upgrade('Double-thick glasses', 'Grandmas are twice as efficient.',
		CCalc.Buildings.Grandma.basePrice * tier5, [1, 13], 'gma:100');
	order = 300;
	new Upgrade('Gingerbread scarecrows', 'Farms are twice as efficient.',
		CCalc.Buildings.Farm.basePrice * tier5, [2, 13], 'farm:100');
	order = 400;
	new Upgrade('Recombobulators', 'Factories are twice as efficient.',
		CCalc.Buildings.Factory.basePrice * tier5, [4, 13], 'fact:100');
	order = 500;
	new Upgrade('H-bomb mining', 'Mines are twice as efficient.',
		CCalc.Buildings.Mine.basePrice * tier5, [3, 13], 'mine:100');
	order = 600;
	new Upgrade('Chocolate monoliths', 'Shipments are twice as efficient.',
		CCalc.Buildings.Shipment.basePrice * tier5, [5, 13], 'ship:100');
	order = 700;
	new Upgrade('Aqua crustulae', 'Alchemy labs are twice as efficient.',
		CCalc.Buildings['Alchemy lab'].basePrice * tier5, [6, 13], 'alab:100');
	order = 800;
	new Upgrade('Brane transplant', 'Portals are twice as efficient.',
		CCalc.Buildings.Portal.basePrice * tier5, [7, 13], 'port:100');
	order = 900;
	new Upgrade('Yestermorrow comparators',
		'Time machines are twice as efficient.',
		CCalc.Buildings['Time machine'].basePrice * tier5, [8, 13], 'tmach:100');
	order = 1000;
	new Upgrade('Reverse cyclotrons',
		'Antimatter condensers are twice as efficient.',
		CCalc.Buildings['Antimatter condenser'].basePrice * tier5, [13, 13], 'anti:100');
	order = 150;
	new Upgrade('Unobtainium mouse', 'Clicking gains +1% of your CpS.',
		5000000000000, [11, 13], false, clicksReq(100000000000));
	order = 10020;
	new Upgrade('Caramoas', 'Cookie production multiplier +25%.',
		999999999999999, [14, 4], 'cook plus:25', cooksChipsReq(9999999999999, 1));
	new Upgrade('Sagalongs', 'Cookie production multiplier +25%.',
		999999999999999, [15, 3], 'cook plus:25', cooksChipsReq(9999999999999, 2));
	new Upgrade('Shortfoils', 'Cookie production multiplier +25%.',
		999999999999999, [15, 4], 'cook plus:25', cooksChipsReq(9999999999999, 3));
	new Upgrade('Win mints', 'Cookie production multiplier +25%.',
		999999999999999, [14, 3], 'cook plus:25', cooksChipsReq(9999999999999, 4));
	order = 40000;
	new Upgrade('Perfect idling',
		'You keep producing cookies even while the game is closed.',
		7, [10, 0], 'debug'); //debug purposes only
	order = 10020;
	new Upgrade('Fig gluttons', 'Cookie production multiplier +25%.',
		999999999999999, [17, 4], 'cook plus:25',
		cooksChipsReq(999999999999999, 10));
	new Upgrade('Loreols', 'Cookie production multiplier +25%.',
		999999999999999, [16, 3], 'cook plus:25',
		cooksChipsReq(999999999999999, 100));
	new Upgrade('Jaffa cakes', 'Cookie production multiplier +25%.',
		999999999999999, [17, 3], 'cook plus:25',
		cooksChipsReq(999999999999999, 500));
	new Upgrade('Grease\'s cups', 'Cookie production multiplier +25%.',
		999999999999999, [16, 4], 'cook plus:25',
		cooksChipsReq(999999999999999, 2000));
	order = 30000;
	new Upgrade('Heavenly chip secret',
		'Unlocks 5% of the potential of your heavenly chips.',
		11, [19, 7], false,
		function () { return CCalc.chips > 0; });
	new Upgrade('Heavenly cookie stand',
		'Unlocks 25% of the potential of your heavenly chips.',
		1111, [18, 7], false,
		function () { return CCalc.chips > 0 && hasUp('Heavenly chip secret'); });
	new Upgrade('Heavenly bakery',
		'Unlocks 50% of the potential of your heavenly chips.',
		111111, [17, 7], false,
		function () { return CCalc.chips > 0 && hasUp('Heavenly cookie stand'); });
	new Upgrade('Heavenly confectionery',
		'Unlocks 75% of the potential of your heavenly chips.',
		11111111, [16, 7], false,
		function () { return CCalc.chips > 0 && hasUp('Heavenly bakery'); });
	new Upgrade('Heavenly key',
		'Unlocks 100% of the potential of your heavenly chips.',
		1111111111, [15, 7], false,
		function () { return CCalc.chips > 0 && hasUp('Heavenly confectionery'); });
	order = 10000;
	new Upgrade('Skull cookies', 'Cookie production multiplier +20%.',
		444444444444, [12, 8], 'cook plus:20');
	new Upgrade('Ghost cookies', 'Cookie production multiplier +20%.',
		444444444444, [13, 8], 'cook plus:20');
	new Upgrade('Bat cookies', 'Cookie production multiplier +20%.',
		444444444444, [14, 8], 'cook plus:20');
	new Upgrade('Slime cookies', 'Cookie production multiplier +20%.',
		444444444444, [15, 8], 'cook plus:20');
	new Upgrade('Pumpkin cookies', 'Cookie production multiplier +20%.',
		444444444444, [16, 8], 'cook plus:20');
	new Upgrade('Eyeball cookies', 'Cookie production multiplier +20%.',
		444444444444, [17, 8], 'cook plus:20');
	new Upgrade('Spider cookies', 'Cookie production multiplier +20%.',
		444444444444, [18, 8], 'cook plus:20');
	order = 14000;
	new Upgrade('Persistent memory',
		'Subsequent research will be 10 times as fast.',
		100000000000, [9, 2], false, function () {
			return CCalc.chips >= 1 && hasUp('Bingo center/Research facility');
		});
	order = 40000;
	new Upgrade('Wrinkler doormat', 'Wrinklers spawn much more frequently.',
		7, [19, 8], 'debug'); //debug purposes only
	order = 10200;
	new Upgrade('Christmas tree biscuits', 'Cookie production multiplier +20%.',
		252525252525, [12, 10], 'cook plus:20');
	new Upgrade('Snowflake biscuits', 'Cookie production multiplier +20%.',
		252525252525, [13, 10], 'cook plus:20');
	new Upgrade('Snowman biscuits', 'Cookie production multiplier +20%.',
		252525252525, [14, 10], 'cook plus:20');
	new Upgrade('Holly biscuits', 'Cookie production multiplier +20%.',
		252525252525, [15, 10], 'cook plus:20');
	new Upgrade('Candy cane biscuits', 'Cookie production multiplier +20%.',
		252525252525, [16, 10], 'cook plus:20');
	new Upgrade('Bell biscuits', 'Cookie production multiplier +20%.',
		252525252525, [17, 10], 'cook plus:20');
	new Upgrade('Present biscuits', 'Cookie production multiplier +20%.',
		252525252525, [18, 10], 'cook plus:20');
	order = 10020;
	new Upgrade('Gingerbread men', 'Cookie production multiplier +25%.',
		9999999999999999, [18, 4], 'cook plus:25', cooksReq(99999999999999));
	new Upgrade('Gingerbread trees', 'Cookie production multiplier +25%.',
		9999999999999999, [18, 3], 'cook plus:25', cooksReq(99999999999999));
	order = 25000;
	new Upgrade('A festive hat', 'Unlocks... something.', 25, [19, 9], false,
		function () {
			return getCookBaked() >= 25 && $('#seasonSel')[0].value === 'christmas';
		});
	new Upgrade('Increased merriness', 'Cookie production multiplier +15%.',
		2525, [17, 9], 'plus:15');
	new Upgrade('Improved jolliness', 'Cookie production multiplier +15%.',
		2525, [17, 9], 'plus:15');
	new Upgrade('A lump of coal', 'Cookie production multiplier +1%.',
		2525, [13, 9], 'plus:1');
	new Upgrade('An itchy sweater', 'Cookie production multiplier +1%.',
		2525, [14, 9], 'plus:1');
	new Upgrade('Reindeer baking grounds',
		'Reindeer appear twice as frequently.', 2525, [12, 9]);
	new Upgrade('Weighted sleighs', 'Reindeer are twice as slow.',
		2525, [12, 9]);
	new Upgrade('Ho ho ho-flavored frosting', 'Reindeer give twice as much.',
		2525, [12, 9]);
	new Upgrade('Season savings', 'All buildings are 1% cheaper.',
		2525, [16, 9], 'buildPriceRed');
	new Upgrade('Toy workshop', 'All upgrades are 5% cheaper.',
		2525, [16, 9], 'upPriceRed');
	new Upgrade('Naughty list', 'Grandmas are twice as productive.',
		2525, [15, 9]);
	new Upgrade('Santa\'s bottomless bag', 'Random drops are 10% more common.',
		2525, [19, 9]);
	new Upgrade('Santa\'s helpers', 'Clicking is 10% more powerful.',
		2525, [19, 9]);
	new Upgrade('Santa\'s legacy',
		'Cookie production multiplier +10% per Santa\'s levels.', 2525, [19, 9]);
	new Upgrade('Santa\'s milk and cookies', 'Milk is 5% more powerful.',
		2525, [19, 9]);
	order = 40000;
	new Upgrade('Reindeer season', 'Reindeer spawn much more frequently.',
		7, [12, 9], 'debug'); //debug purposes only
	order = 25000;
	new Upgrade('Santa\'s dominion',
		'Cookie production multiplier +50%.\nAll buildings are 1% cheaper.\nAll upgrades are 2% cheaper.',
		2525252525252525, [19,10], 'plus:50 buildPriceRed upPriceRed', function () {
			return $('#santaLevel')[0].selectedIndex >= CCalc.santaMax;
		});
	order = 10300;
	new Upgrade('Pure heart biscuits', 'Cookie production multiplier +25%.',
		9999999999999999, [19, 3], 'cook plus:25', function () {
			return getCookBaked() >= 99999999999999 &&
				$('#seasonSel')[0].value === 'valentines';
		});
	new Upgrade('Ardent heart biscuits', 'Cookie production multiplier +25%.',
		9999999999999999, [20, 3], 'cook plus:25', function () {
			return getCookBaked() >= 99999999999999 &&
				$('#seasonSel')[0].value === 'valentines' &&
				hasUp('Pure heart biscuits');
		});
	new Upgrade('Sour heart biscuits', 'Cookie production multiplier +25%.',
		9999999999999999, [20, 4], 'cook plus:25', function () {
			return getCookBaked() >= 99999999999999 &&
				$('#seasonSel')[0].value === 'valentines' &&
				hasUp('Ardent heart biscuits');
		});
	new Upgrade('Weeping heart biscuits', 'Cookie production multiplier +25%.',
		9999999999999999, [21, 3], 'cook plus:25', function () {
			return getCookBaked() >= 99999999999999 &&
				$('#seasonSel')[0].value === 'valentines' &&
				hasUp('Sour heart biscuits');
		});
	new Upgrade('Golden heart biscuits', 'Cookie production multiplier +25%.',
		9999999999999999, [21, 4], 'cook plus:25', function () {
			return getCookBaked() >= 99999999999999 &&
				$('#seasonSel')[0].value === 'valentines' &&
				hasUp('Weeping heart biscuits');
		});
	new Upgrade('Eternal heart biscuits', 'Cookie production multiplier +25%.',
		9999999999999999, [19, 4], 'cook plus:25', function () {
			return getCookBaked() >= 99999999999999 &&
				$('#seasonSel')[0].value === 'valentines' &&
				hasUp('Golden heart biscuits');
		});
	order = 1100;
	new Upgrade('Gem polish', 'Prisms gain +1,000,000 base CpS.',
		CCalc.Buildings.Prism.basePrice * tier1, [14, 0], 'prism:1');
	new Upgrade('9th color', 'Prisms are twice as efficient.',
		CCalc.Buildings.Prism.basePrice * tier2, [14, 0], 'prism:1');
	new Upgrade('Chocolate light', 'Prisms are twice as efficient.',
		CCalc.Buildings.Prism.basePrice * tier3, [14, 1], 'prism:10');
	new Upgrade('Grainbow', 'Prisms are twice as efficient.',
		CCalc.Buildings.Prism.basePrice * tier4, [14, 2], 'prism:50');
	new Upgrade('Pure cosmic light', 'Prisms are twice as efficient.',
		CCalc.Buildings.Prism.basePrice * tier5, [14, 13], 'prism:100');
	order = 250;
	new Upgrade('Rainbow grandmas', 'Grandmas are twice as efficient.',
		CCalc.Buildings.Prism.basePrice * tier2,
		[10, 9], false, gmTypeReq('prism'));
	order = 24000;
	new Upgrade('Season switcher',
		'Allows you to trigger seasonal events at will, for a price.',
		1111111111111, [16, 6], false, cooksChipsReq(9999999999999, 5000));
	var seasonPrice = function (num) {
		if (isNaN(num)) { num = getIn('seasonCount'); }
		return CCalc.seasonBasePrice * Math.pow(2, num);
	};
	new Upgrade('Festive biscuit',
		'Triggers Christmas season for the next 24 hours.\nTriggering another season will cancel this one.',
		CCalc.seasonBasePrice, [12,10], 'hidden season:christmas');
	last.priceFn = seasonPrice;
	$('#nextSeason').html(formatNumber(CCalc.seasonBasePrice));
	new Upgrade('Ghostly biscuit',
		'Triggers Halloween season for the next 24 hours.\nTriggering another season will cancel this one.',
		CCalc.seasonBasePrice, [13, 8], 'hidden season:halloween');
	last.priceFn = seasonPrice;
	new Upgrade('Lovesick biscuit',
		'Triggers Valentine\'s Day season for the next 24 hours.\nTriggering another season will cancel this one.',
		CCalc.seasonBasePrice, [20, 3], 'hidden season:valentines');
	last.priceFn = seasonPrice;
	new Upgrade('Fool\'s biscuit',
		'Triggers Business Day season for the next 24 hours.\nTriggering another season will cancel this one.',
		CCalc.seasonBasePrice, [17, 6], 'hidden season:fools');
	last.priceFn = seasonPrice;
	order = 40000;
	new Upgrade('Eternal seasons', 'Seasons now last forever.',
		7, [16, 6], 'debug'); //debug purposes only
	order = 20000;
	new Upgrade('Kitten managers', 'You gain more CpS the more milk you have.',
		900000000000000000000, [9, 7], 'kitt:4');
	order = 100;
	new Upgrade('Septillion fingers',
		'The mouse and cursors gain +400 cookies for each non-cursor object owned.',
		5000000000000000, [12, 14], 'curs:280');
	new Upgrade('Octillion fingers',
		'The mouse and cursors gain +800 cookies for each non-cursor object owned.',
		50000000000000000, [12, 14], 'curs:320');
	order = 150;
	new Upgrade('Eludium mouse', 'Clicking gains +1% of your CpS.',
		500000000000000, [11, 14], false, clicksReq(10000000000000));
	new Upgrade('Wishalloy mouse', 'Clicking gains +1% of your CpS.',
		50000000000000000, [11, 14], false, clicksReq(1000000000000000));
	order = 200;
	new Upgrade('Aging agents', 'Grandmas are twice as efficient.',
		CCalc.Buildings.Grandma.basePrice * tier6, [1, 14], 'gma:200');
	order = 300;
	new Upgrade('Pulsar sprinklers', 'Farms are twice as efficient.',
		CCalc.Buildings.Farm.basePrice * tier6, [2, 14], 'farm:200');
	order = 400;
	new Upgrade('Deep-bake process', 'Factories are twice as efficient.',
		CCalc.Buildings.Factory.basePrice * tier6, [4, 14], 'fact:200');
	order = 500;
	new Upgrade('Coreforge', 'Mines are twice as efficient.',
		CCalc.Buildings.Mine.basePrice * tier6, [3, 14], 'mine:200');
	order = 600;
	new Upgrade('Generation ship', 'Shipments are twice as efficient.',
		CCalc.Buildings.Shipment.basePrice * tier6,[5, 14], 'ship:200');
	order = 700;
	new Upgrade('Origin crucible', 'Alchemy labs are twice as efficient.',
		CCalc.Buildings['Alchemy lab'].basePrice * tier6, [6, 14], 'alab:200');
	order = 800;
	new Upgrade('Deity-sized portals', 'Portals are twice as efficient.',
		CCalc.Buildings.Portal.basePrice * tier6, [7, 14], 'port:200');
	order = 900;
	new Upgrade('Far future enactment', 'Time machines are twice as efficient.',
		CCalc.Buildings['Time machine'].basePrice * tier6, [8, 14], 'tmach:200');
	order = 1000;
	new Upgrade('Nanocosmics', 'Antimatter condensers are twice as efficient.',
		CCalc.Buildings['Antimatter condenser'].basePrice * tier6, [13, 14], 'anti:200');
	order = 1100;
	new Upgrade('Glow-in-the-dark', 'Prisms are twice as efficient.',
		CCalc.Buildings.Prism.basePrice * tier6, [14, 14], 'prism:200');
	order = 10020;
	new Upgrade('Rose macarons', 'Cookie production multiplier +30%.',
		999999999999999999, [22, 3], 'cook plus:30',
		cooksChipsReq(9999999999999, 10000));
	new Upgrade('Lemon macarons', 'Cookie production multiplier +30%.',
		999999999999999999, [23, 3], 'cook plus:30',
		cooksChipsReq(9999999999999, 10000));
	new Upgrade('Chocolate macarons', 'Cookie production multiplier +30%.',
		999999999999999999, [24, 3], 'cook plus:30',
		cooksChipsReq(9999999999999, 10000));
	new Upgrade('Pistachio macarons', 'Cookie production multiplier +30%.',
		999999999999999999, [22, 4], 'cook plus:30',
		cooksChipsReq(9999999999999, 10000));
	new Upgrade('Hazelnut macarons', 'Cookie production multiplier +30%.',
		999999999999999999, [23, 4], 'cook plus:30',
		cooksChipsReq(9999999999999, 10000));
	new Upgrade('Violet macarons', 'Cookie production multiplier +30%.',
		999999999999999999, [24, 4], 'cook plus:30',
		cooksChipsReq(9999999999999, 10000));
	order = 40000;
	new Upgrade('Golden switch',
		'Unlocks the Golden switch, available in the menu.\nWhen active, the Golden switch grants you a passive CpS boost, but prevents golden cookies from spawning.\nNote : this doesn\'t work very well yet.',
		7, [10, 1], 'debug'); //debug purposes only - note : not yet available in the menu
	order = 24000;
	new Upgrade('Bunny biscuit',
		'Triggers Easter season for the next 24 hours.\nTriggering another season will cancel this one.',
		CCalc.seasonBasePrice, [0, 12], 'hidden season:easter');
	last.priceFn = seasonPrice;
	var eggPrice = 999999999999;
	var eggPrice2 = 99999999999999;
	new Upgrade('Chicken egg', 'Cookie production global multiplier +1%.',
		eggPrice, [1, 12], 'egg');
	new Upgrade('Duck egg', 'Cookie production global multiplier +1%.',
		eggPrice, [2, 12], 'egg');
	new Upgrade('Turkey egg', 'Cookie production global multiplier +1%.',
		eggPrice, [3, 12], 'egg');
	new Upgrade('Quail egg', 'Cookie production global multiplier +1%.',
		eggPrice, [4, 12], 'egg');
	new Upgrade('Robin egg', 'Cookie production global multiplier +1%.',
		eggPrice, [5, 12], 'egg');
	new Upgrade('Ostrich egg', 'Cookie production global multiplier +1%.',
		eggPrice, [6, 12], 'egg');
	new Upgrade('Cassowary egg', 'Cookie production global multiplier +1%.',
		eggPrice, [7, 12], 'egg');
	new Upgrade('Salmon roe', 'Cookie production global multiplier +1%.',
		eggPrice, [8, 12], 'egg');
	new Upgrade('Frogspawn', 'Cookie production global multiplier +1%.',
		eggPrice, [9, 12], 'egg');
	new Upgrade('Shark egg', 'Cookie production global multiplier +1%.',
		eggPrice, [10, 12], 'egg');
	new Upgrade('Turtle egg', 'Cookie production global multiplier +1%.',
		eggPrice, [11, 12], 'egg');
	new Upgrade('Ant larva', 'Cookie production global multiplier +1%.',
		eggPrice, [12, 12], 'egg');
	new Upgrade('Golden goose egg', 'Golden cookies appear 5% more often.',
		eggPrice2, [13, 12], 'egg');
	new Upgrade('Faberge egg', 'All buildings and upgrades are 1% cheaper.',
		eggPrice2, [14, 12], 'egg buildPriceRed upPriceRed');
	new Upgrade('Wrinklerspawn', 'Wrinklers explode into 5% more cookies.',
		eggPrice2, [15, 12], 'egg');
	new Upgrade('Cookie egg', 'Clicking is 10% more powerful.',
		eggPrice2, [16, 12], 'egg');
	new Upgrade('Omelette', 'Other eggs appear 10% more frequently.',
		eggPrice2, [17, 12], 'egg');
	new Upgrade('Chocolate egg', 'Contains a lot of cookies.',
		eggPrice2, [18, 12], 'egg');
	new Upgrade('Century egg',
		'You gain more CpS the longer you\'ve played in the current session.',
		eggPrice2, [19, 12], 'egg');
	new Upgrade('"egg"', '+9 CpS', eggPrice2, [20, 12], 'egg');
	order = 10020;
	new Upgrade('Caramel macarons', 'Cookie production multiplier +30%.',
		999999999999999999, [25, 3], 'cook plus:30',
		cooksChipsReq(9999999999999, 10000));
	new Upgrade('Licorice macarons', 'Cookie production multiplier +30%.',
		999999999999999999, [25, 4], 'cook plus:30',
		cooksChipsReq(9999999999999, 10000));

	CCalc.countedUpgrades--;
	upEles.sort(sortFn);
	var ele = [$('#upgradeNorm'), $('#upgradeCookies'), $('#upgradeDebug')];
	$.each(upEles, function () {
		if (this.cook) {
			ele[1].append(this.upIcon);
		} else if (this.debug) {
			ele[2].append(this.upIcon);
		} else {
			ele[0].append(this.upIcon);
		}
		if (this.season || this.hidden) { hide(this.upIcon); }
	});

	order = 100;
	achs = [
		'Wake and bake', 1,
		'Making some dough', 100,
		'So baked right now', 1000,
		'Fledgling bakery', 10000,
		'Affluent bakery', 100000,
		'World-famous bakery', 1000000,
		'Cosmic bakery', 10000000,
		'Galactic bakery', 100000000,
		'Universal bakery', 1000000000,
		'Timeless bakery', 10000000000,
		'Infinite bakery', 100000000000,
		'Immortal bakery', 1000000000000,
		'You can stop now', 10000000000000,
		'Cookies all the way down', 100000000000000,
		'Overdose', 1000000000000000,
		'How?', 10000000000000000
	];
	eventfn = function (cookies) {
		return function () { return getCookBaked() >= cookies; };
	};
	for (i = 0; i < achs.length; i += 2) {
		new Achieve(achs[i], 'Bake ' + achs[i + 1] + ' cookie' +
			(achs[i + 1] === 1 ? '' : 's') + '.',
			i === 30 ? [11, 5] : [Math.min(10, i / 2), 5], eventfn(achs[i + 1]));
	}
	order = 200;
	achs = [
		'Casual baking', 1,
		'Hardcore baking', 10,
		'Steady tasty stream', 100,
		'Cookie monster', 1000,
		'Mass producer', 10000,
		'Cookie vortex', 1000000,
		'Cookie pulsar', 10000000,
		'Cookie quasar', 100000000,
		'A world filled with cookies', 10000000000,
		'Let\'s never bake again', 1000000000000
	];
	eventfn = function (cookies) {
		return function (check) {
			if (isundef(check)) { check = CCalc.total.cps; }
			return check >= cookies;
		};
	};
	for (i = 0; i < achs.length; i += 2) {
		new Achieve(achs[i], 'Bake ' + achs[i + 1] + ' cookie' +
			(achs[i + 1] === 1 ? '' : 's') + ' per second.',
			[i / 2, 5], eventfn(achs[i + 1]));
		CCalc.cpsAchs.push(achs[i]);
	}
	order = 30000;
	new Achieve('Sacrifice',
		'Reset your game with 1 million cookies baked.', [11, 6]);
	new Achieve('Oblivion',
		'Reset your game with 1 billion cookies baked.', [11, 6]);
	new Achieve('From scratch',
		'Reset your game with 1 trillion cookies baked.', [11, 6]);
	order = 11010;
	new Achieve('Neverclick',
		'Make 1 million cookies by only having clicked 15 times.',
		[12, 0], function () {
			return getIn('cookieClicks') <= 15 && getCookBaked() >= 1000000;
		});
	order = 1000;
	new Achieve('Clicktastic', 'Make 1,000 cookies from clicking.',
		[11, 0], clicksReq(1000));
	new Achieve('Clickathlon', 'Make 100,000 cookies from clicking.',
		[11, 1], clicksReq(100000));
	new Achieve('Clickolympics', 'Make 10,000,000 cookies from clicking.',
		[11, 1], clicksReq(10000000));
	new Achieve('Clickorama', 'Make 1,000,000,000 cookies from clicking.',
		[11, 2], clicksReq(1000000000));
	order = 1050;
	new Achieve('Click', 'Have 1 cursor.', [0, 0], 'curs:1');
	new Achieve('Double-click', 'Have 2 cursors.', [0, 6], 'curs:2');
	new Achieve('Mouse wheel', 'Have 50 cursors.', [1, 6], 'curs:50');
	new Achieve('Of Mice and Men', 'Have 100 cursors.', [2, 6], 'curs:100');
	new Achieve('The Digital', 'Have 200 cursors.', [3, 6], 'curs:200');
	order = 1100;
	new Achieve('Just wrong', 'Sell a grandma.', [10, 9], function () {
			var b = CCalc.Buildings.Grandma;
			return getIn(b.buildInAll) > getIn(b.buildIn);
		});
	new Achieve('Grandma\'s cookies', 'Have 1 grandma.', [1, 0], 'gma:1');
	new Achieve('Sloppy kisses', 'Have 50 grandmas.', [1, 1], 'gma:50');
	new Achieve('Retirement home', 'Have 100 grandmas.', [1, 2], 'gma:100');
	order = 1200;
	new Achieve('My first farm', 'Have 1 farm.', [2, 0], 'farm:1');
	new Achieve('Reap what you sow', 'Have 50 farms.', [2, 1], 'farm:50');
	new Achieve('Farm ill', 'Have 100 farms.', [2, 2], 'farm:100');
	order = 1300;
	new Achieve('Production chain', 'Have 1 factory.', [4, 0], 'fact:1');
	new Achieve('Industrial revolution', 'Have 50 factories.', [4, 1], 'fact:50');
	new Achieve('Global warming', 'Have 100 factories.', [4, 2], 'fact:100');
	order = 1400;
	new Achieve('You know the drill', 'Have 1 mine.', [3, 0], 'mine:1');
	new Achieve('Excavation site', 'Have 50 mines.', [3, 1], 'mine:50');
	new Achieve('Hollow the planet', 'Have 100 mines.', [3, 2], 'mine:100');
	order = 1500;
	new Achieve('Expedition', 'Have 1 shipment.', [5, 0], 'ship:1');
	new Achieve('Galactic highway', 'Have 50 shipments.', [5, 1], 'ship:50');
	new Achieve('Far far away', 'Have 100 shipments.', [5, 2], 'ship:100');
	order = 1600;
	new Achieve('Transmutation', 'Have 1 alchemy lab.', [6, 0], 'alab:1');
	new Achieve('Transmogrification', 'Have 50 alchemy labs.', [6, 1], 'alab:50');
	new Achieve('Gold member', 'Have 100 alchemy labs.', [6, 2], 'alab:100');
	order = 1700;
	new Achieve('A whole new world', 'Have 1 portal.', [7, 0], 'port:1');
	new Achieve('Now you\'re thinking', 'Have 50 portals.', [7, 1], 'port:50');
	new Achieve('Dimensional shift', 'Have 100 portals.', [7, 2], 'port:100');
	order = 1800;
	new Achieve('Time warp', 'Have 1 time machine.', [8, 0], 'tmach:1');
	new Achieve('Alternate timeline', 'Have 50 time machines.',
		[8, 1], 'tmach:50');
	new Achieve('Rewriting history', 'Have 100 time machines.',
		[8, 2], 'tmach:100');
	order = 7000;
	new Achieve('One with everything', 'Have at least 1 of every building.',
		[4, 6], function () {
			for (var i in CCalc.Buildings) {
				if (CCalc.Buildings[i].count < 1) { return false; }
			}
			return true;
		});
	new Achieve('Mathematician',
		'Have at least 1 of the most expensive object, 2 of the second-most expensive, 4 of the next and so on (capped at 128).',
		[7, 6], function () {
			var i,
				check = 1;
			for (i = CCalc.numBuildings - 1; i >= 0; i--) {
				if (CCalc.BuildingsById[i].count < check) { return false; }
				check = Math.min(128, check * 2);
			}
			return true;
		});
	new Achieve('Base 10',
		'Have at least 10 of the most expensive object, 20 of the second-most expensive, 30 of the next and so on.',
		[8, 6], function () {
			var i,
				check = 10;
			for (i = CCalc.numBuildings - 1; i >= 0; i--) {
				if (CCalc.BuildingsById[i].count < check) { return false; }
				check += 10;
			}
			return true;
		});
	order = 10000;
	new Achieve('Golden cookie', 'Click a golden cookie.', [10, 1],
		function () { return getGoldClicks() >= 1; });
	new Achieve('Lucky cookie', 'Click 7 golden cookies.', [10, 1],
		function () { return getGoldClicks() >= 7; });
	new Achieve('A stroke of luck', 'Click 27 golden cookies.', [10, 1],
		function () { return getGoldClicks() >= 27; });
	order = 30200;
	new Achieve('Cheated cookies taste awful', 'Hack in some cookies.', [10, 6],
		false, true);
	order = 11010;
	new Achieve('Uncanny clicker', 'Click really, really fast.', [12, 0]);
	order = 5000;
	new Achieve('Builder', 'Own 100 buildings.', [4, 6],
		function () { return CCalc.total.count >= 100; });
	new Achieve('Architect', 'Own 400 buildings.', [5, 6],
		function () { return CCalc.total.count >= 400; });
	order = 6000;
	new Achieve('Enhancer', 'Purchase 20 upgrades.', [9, 0],
		function () { return CCalc.total.upCount >= 20; });
	new Achieve('Augmenter', 'Purchase 50 upgrades.', [9, 1],
		function () { return CCalc.total.upCount >= 50; });
	order = 11000;
	new Achieve('Cookie-dunker', 'Dunk the cookie.', [4, 7]);
	order = 10000;
	new Achieve('Fortune', 'Click 77 golden cookies.', [10, 1],
		function () { return getGoldClicks() >= 77; });
	order = 31000;
	new Achieve('True Neverclick',
		'Make 1 million cookies with no cookie clicks.', [12, 0], function () {
			return getIn('cookieClicks') === 0 && getCookBaked() >= 1000000;
		}, true);
	order = 20000;
	new Achieve('Elder nap', 'Appease the grandmatriarchs at least once.',
		[8, 9], function () { return getIn('numPledges') >= 1; });
	new Achieve('Elder slumber', 'Appease the grandmatriarchs at least 5 times.',
		[8, 9], function () { return getIn('numPledges') >= 5; });
	order = 1150;
	new Achieve('Elder', 'Own at least 7 grandma types.', [10, 9],
		function () {
			return (hasUp('Farmer grandmas') + hasUp('Worker grandmas') +
				hasUp('Miner grandmas') + hasUp('Cosmic grandmas') +
				hasUp('Transmuted grandmas') + hasUp('Altered grandmas') +
				hasUp('Grandmas\' grandmas') + hasUp('Antigrandmas')) >= 7;
		});
	order = 20000;
	new Achieve('Elder calm',
		'Declare a covenant with the grandmatriarchs.', [8, 9]);
	order = 5000;
	new Achieve('Engineer', 'Own 800 buildings.', [6, 6],
		function () { return CCalc.total.count >= 800; });
	order = 10000;
	new Achieve('Leprechaun', 'Click 777 golden cookies.', [10, 1],
		function () { return getGoldClicks() >= 777; });
	new Achieve('Black cat\'s paw', 'Click 7777 golden cookies.', [10, 1],
		function () { return getGoldClicks() >= 7777; });
	order = 30000;
	new Achieve('Nihilism',
		'Reset your game with 1 quadrillion cookies baked.', [11, 7]);
	order = 1900;
	new Achieve('Antibatter', 'Have 1 antimatter condenser.', [13, 0], 'anti:1');
	new Achieve('Quirky quarks', 'Have 50 antimatter condensers.',
		[13, 1], 'anti:50');
	new Achieve('It does matter!', 'Have 100 antimatter condensers.',
		[13, 2], 'anti:100');
	order = 6000;
	new Achieve('Upgrader', 'Purchase 100 upgrades.', [9, 2],
		function () { return CCalc.total.upCount >= 100; });
	order = 7000;
	new Achieve('Centennial', 'Have at least 100 of everything.', [9, 6],
		function () {
			for (var i in CCalc.Buildings) {
				if (CCalc.Buildings[i].count < 100) { return false; }
			}
			return true;
		});
	order = 30500;
	new Achieve('Hardcore',
		'Get to 1 billion cookies baked with no upgrades purchased.', [12, 6],
		function (check) {
			if (isundef(check)) { check = getCookBaked(); }
			return CCalc.total.upCount === 0 && check >= 1000000000;
		},
		true);
	order = 30600;
	new Achieve('Speed baking I',
		'Get to 1 million cookies baked in 35 minutes (with no heavenly upgrades).',
		[12, 5], false, true);
	new Achieve('Speed baking II',
		'Get to 1 million cookies baked in 25 minutes (with no heavenly upgrades).',
		[13, 5], false, true);
	new Achieve('Speed baking III',
		'Get to 1 million cookies baked in 15 minutes (with no heavenly upgrades).',
		[14, 5], false, true);
	order = 61000;
	new Achieve('Getting even with the oven',
		'Defeat the Sentient Furnace in the factory dungeons.',
		[12, 7], false , true);
	new Achieve('Now this is pod-smashing',
		'Defeat the Ascended Baking Pod in the factory dungeons.',
		[12, 7], false , true);
	new Achieve('Chirped out', 'Find and defeat Chirpy, the dysfunctionning alarm bot.',
		[13, 7], false, true);
	new Achieve('Follow the white rabbit', 'Find and defeat the elusive sugar bunny.',
		[14, 7], false, true);
	order = 1000;
	new Achieve('Clickasmic', 'Make 100,000,000,000 cookies from clicking.',
		[11, 13], clicksReq(100000000000));
	order = 1100;
	new Achieve('Friend of the ancients', 'Have 150 grandmas.', [1, 13], 'gma:150');
	new Achieve('Ruler of the ancients', 'Have 200 grandmas.', [1, 14], 'gma:200');
	order = 32000;
	new Achieve('Wholesome', 'Unlock 100% of your heavenly chips power.', [15, 7],
		function () {
			return hasUp('Heavenly chip secret') && hasUp('Heavenly cookie stand') &&
				hasUp('Heavenly bakery') && hasUp('Heavenly confectionery') &&
				hasUp('Heavenly key');
		});
	order = 33000;
	new Achieve('Just plain lucky',
		'You have 1 chance in 500,000 every second of earning this achievement.',
		[15, 6], false, true);
	order = 21000;
	new Achieve('Itchscratcher', 'Burst 1 wrinkler.', [19, 8],
		function () { return getIn('wrinklersPopped') >= 1; });
	new Achieve('Wrinklesquisher', 'Burst 50 wrinklers.', [19, 8],
		function () { return getIn('wrinklersPopped') >= 50; });
	new Achieve('Moistburster', 'Burst 200 wrinklers.', [19, 8],
		function () { return getIn('wrinklersPopped') >= 200; });
	order = 22000;
	new Achieve('Spooky cookies',
		'Unlock every Halloween-themed cookie.\nOwning this achievement makes Halloween-themed cookies drop more frequently in future playthroughs.',
		[12, 8], function () {
			return hasUp('Skull cookies') && hasUp('Ghost cookies') &&
				hasUp('Bat cookies') && hasUp('Slime cookies') &&
				hasUp('Pumpkin cookies') && hasUp('Eyeball cookies') &&
				hasUp('Spider cookies');
		});
	order = 22100;
	new Achieve('Coming to town', 'Reach Santa\'s 7th form.', [18, 9],
		function () { return $('#santaLevel')[0].selectedIndex >= 7; });
	new Achieve('All hail Santa', 'Reach Santa\'s final form.', [18, 9],
		function () { return $('#santaLevel')[0].selectedIndex >= CCalc.santaMax; });
	new Achieve('Let it snow', 'Unlock every Christmas-themed cookie.',
		[19, 9], function () {
			return hasUp('Christmas tree biscuits') &&
				hasUp('Snowflake biscuits') && hasUp('Snowman biscuits') &&
				hasUp('Holly biscuits') && hasUp('Candy cane biscuits') &&
				hasUp('Bell biscuits') && hasUp('Present biscuits');
		});
	new Achieve('Oh deer', 'Pop 1 reindeer.', [12, 9],
		function () { return getIn('reinClicks') >= 1; });
	new Achieve('Sleigh of hand', 'Pop 50 reindeer.', [12, 9],
		function () { return getIn('reinClicks') >= 50; });
	new Achieve('Reindeer sleigher', 'Pop 200 reindeer.', [12, 9],
		function () { return getIn('reinClicks') >= 200; });
	order = 1200;
	new Achieve('Perfected agriculture', 'Have 150 farms.', [2, 13], 'farm:150');
	order = 1300;
	new Achieve('Ultimate automation', 'Have 150 factories.',
		[4, 13], 'fact:150');
	order = 1400;
	new Achieve('Can you dig it', 'Have 150 mines.', [3, 13], 'mine:150');
	order = 1500;
	new Achieve('Type II civilization', 'Have 150 shipments.',
		[5, 13], 'ship:150');
	order = 1600;
	new Achieve('Gild wars', 'Have 150 alchemy labs.', [6, 13], 'alab:150');
	order = 1700;
	new Achieve('Brain-split', 'Have 150 portals.', [7, 13], 'port:150');
	order = 1800;
	new Achieve('Time duke', 'Have 150 time machines.', [8, 13], 'tmach:150');
	order = 1900;
	new Achieve('Molecular maestro', 'Have 150 antimatter condensers.',
		[13, 13], 'anti:150');
	order = 2000;
	new Achieve('Lone photon', 'Have 1 prism.', [14, 0], 'prism:1');
	new Achieve('Dazzling glimmer', 'Have 50 prisms.', [14, 1], 'prism:50');
	new Achieve('Blinding flash', 'Have 100 prisms.', [14, 2], 'prism:100');
	new Achieve('Unending glow', 'Have 150 prisms.', [14, 13], 'prsim:150');
	order = 5000;
	new Achieve('Lord of Constructs', 'Own 1500 buildings.', [6, 6],
		function () { return CCalc.total.count >= 1500; });
	order = 6000;
	new Achieve('Lord of Progress', 'Purchase 150 upgrades.', [9, 2],
		function (check) { return (check || CCalc.total.upCount) >= 150; });
	order = 7002;
	new Achieve('Bicentennial', 'Have at least 200 of everything.', [9, 6],
		function () {
			for (var i in CCalc.Buildings) {
				if (CCalc.Buildings[i].count < 200) { return false; }
			}
			return true;
		});
	order = 22300;
	new Achieve('Lovely cookies',
		'Unlock every Valentine-themed cookie.', [20, 3],
		function () {
			return hasUp('Pure heart biscuits') && hasUp('Ardent heart biscuits') &&
				hasUp('Sour heart biscuits') && hasUp('Weeping heart biscuits') &&
				hasUp('Golden heart biscuits') && hasUp('Eternal heart biscuits');
		});
	order = 7001;
	new Achieve('Centennial and a half', 'Have at least 150 of everything.', [9, 6],
		function () {
			for (var i in CCalc.Buildings) {
				if (CCalc.Buildings[i].count < 150) { return false; }
			}
			return true;
		});
	order = 11000;
	new Achieve('Tiny cookie', 'Click the tiny cookie.', [0, 5]);
	order = 40000;
	new Achieve('You win a cookie',
		'This is for baking 10 billion cookies and making it on the local news.',
		[10, 0], cooksReq(10000000000));
	order = 1070;
	eventfn = function (b, m) { return function () {
		return getIn('build' + b.id + 'baked') >= 10000000000000 * m;
	}; };
	new Achieve('Click delegator',
		'Make 10,000,000,000,000,000,000 cookies just from cursors.', [0, 0],
		eventfn(CCalc.Buildings.Cursor, 1000000));
	order = 1120;
	new Achieve('Gushing grannies',
		'Make 10,000,000,000,000,000,000 cookies just from grandmas.', [1, 0],
		eventfn(CCalc.Buildings.Grandma, 1000000));
	order = 1220;
	new Achieve('I hate manure',
		'Make 10,000,000,000,000 cookies just from farms.', [2, 0],
		eventfn(CCalc.Buildings.Farm, 1));
	order = 1320;
	new Achieve('The incredible machine',
		'Make 100,000,000,000,000 cookies just from factories.', [4, 0],
		eventfn(CCalc.Buildings.Factory, 10));
	order = 1420;
	new Achieve('Never dig down',
		'Make 1,000,000,000,000,000 cookies just from mines.', [3, 0],
		eventfn(CCalc.Buildings.Mine, 100));
	order = 1520;
	new Achieve('And beyond',
		'Make 10,000,000,000,000,000 cookies just from shipments.', [5, 0],
		eventfn(CCalc.Buildings.Shipment, 1000));
	order = 1620;
	new Achieve('Magnum Opus',
		'Make 100,000,000,000,000,000 cookies just from alchemy labs.', [6, 0],
		eventfn(CCalc.Buildings['Alchemy lab'], 10000));
	order = 1720;
	new Achieve('With strange eons',
		'Make 1,000,000,000,000,000,000 cookies just from portals.', [7, 0],
		eventfn(CCalc.Buildings.Portal, 100000));
	order = 1820;
	new Achieve('Spacetime jigamaroo',
		'Make 10,000,000,000,000,000,000 cookies just from time machines.', [8, 0],
		eventfn(CCalc.Buildings['Time machine'], 1000000));
	order = 1920;
	new Achieve('Supermassive',
		'Make 100,000,000,000,000,000,000 cookies just from antimatter condensers.',
		[13, 0], eventfn(CCalc.Buildings['Antimatter condenser'], 10000000));
	order = 2020;
	new Achieve('Praise the sun',
		'Make 1,000,000,000,000,000,000,000 cookies just from prisms.', [14, 0],
		eventfn(CCalc.Buildings.Prism, 100000000));
	order = 1000;
	new Achieve('Clickageddon', 'Make 10,000,000,000,000 cookies from clicking.',
		[11, 14], clicksReq(10000000000000));
	new Achieve('Clicknarok', 'Make 1,000,000,000,000,000 cookies from clicking.',
		[11, 14], clicksReq(1000000000000000));
	order = 1050;
	new Achieve('Extreme polydactyly', 'Have 300 cursors.', [12, 13], 'curs:300');
	new Achieve('Dr. T', 'Have 400 cursors.', [12, 14], 'curs:400');
	order = 1100;
	new Achieve('The old never bothered me anyway', 'Have 250 grandmas.',
		[1, 14], 'gma:250');
	order = 1200;
	new Achieve('Homegrown', 'Have 200 farms.', [2, 14], 'farm:200');
	order = 1300;
	new Achieve('Technocracy', 'Have 200 factories.', [4, 14], 'fact:200');
	order = 1400;
	new Achieve('The center of the Earth', 'Have 200 mines.',
		[3, 14], 'mine:200');
	order = 1500;
	new Achieve('We come in peace', 'Have 200 shipments.', [5, 14], 'ship:200');
	order = 1600;
	new Achieve('The secrets of the universe', 'Have 200 alchemy labs.',
		[6, 14], 'alab:200');
	order = 1700;
	new Achieve('Realm of the Mad God', 'Have 200 portals.', [7, 14], 'port:200');
	order = 1800;
	new Achieve('Forever and ever', 'Have 200 time machines.',
		[8, 14], 'tmach:200');
	order = 1900;
	new Achieve('Walk the planck', 'Have 200 antimatter condensers.',
		[13, 14], 'anti:200');
	order = 2000;
	new Achieve('Rise and shine', 'Have 200 prisms.', [14, 14], 'prism:200');
	order = 30200;
	new Achieve('God complex', 'Name yourself Orteil.', [17, 5], function () {
		return $('#bakeryName')[0].value.toLowerCase() === 'orteil';
	}, 3);
	new Achieve('Third-party', 'Use an add-on.', [16, 5], false, 3);
	order = 30000;
	new Achieve('Dematerialize',
		'Reset your game with 1 quintillion cookies baked.', [11, 7]);
	new Achieve('Nil zero zilch',
		'Reset your game with 1 sextillion cookies baked.', [11, 7]);
	new Achieve('Transcendence',
		'Reset your game with 1 septillion cookies baked.', [11, 8]);
	new Achieve('Obliterate',
		'Reset your game with 1 octillion cookies baked.', [11, 8]);
	new Achieve('Negative void',
		'Reset your game with 1 nonillion cookies baked.', [11, 8], false, 3);
	order = 22400;
	new Achieve('The hunt is on', 'Unlock 1 egg.', [1, 12], eggReq(1));
	new Achieve('Egging on', 'Unlock 7 eggs.', [4, 12], eggReq(7));
	new Achieve('Mass Easteria', 'Unlock 14 eggs.', [7, 12], eggReq(14));
	new Achieve('Hide & seek champion', 'Unlock all the eggs.',
		[13, 12], function () {
			var i,
				eggs = CCalc.upLists.egg;
			for (i = 0; i < eggs.length; i++) {
				if (!eggs[i].owned && !eggs[i].unlocked) {
					return false;
				}
			}
			return true;
		});
	order = 11000;
	new Achieve('What\'s in a name', 'Give your bakery a name.', [15, 9],
		function () { return CCalc.changedBakeryName; });

	achEles.sort(sortFn);
	ele = $('#achNorm');
	var ele2 = $('#achShadow');
	$.each(achEles, function () {
		if (this.shadow) {
			ele2.append(this.achIcon);
		} else {
			ele.append(this.achIcon);
		}
	});

	$(window).on('keydown keyup', function (e) {
		CCalc.focusing = false;
		$(document.forms[0]).toggleClass('altMode', checkEventAltMode(e));
	}).on('blur', function () { $(document.forms[0]).removeClass('altMode'); })
	.on('focus', function () { CCalc.focusing = true; })
	.click(function (e) {
		if (CCalc.focusing) {
			CCalc.focusing = false;
			$(document.forms[0]).toggleClass('altMode', checkEventAltMode(e));
		}
	});

	$(document).on('click', '.minus', function (e) {
		var v = this.pmIn;
		v.value = Math.max(v.minIn || 0, getIn(v) - 1 - 9 *
			($('#plusMinus10')[0].checked ^ checkEventAltMode(e)));
		checkInVal(v);
	}).on('click', '.plus', function (e) {
		var v = this.pmIn,
			val = getIn(v) + 1 + 9 *
				($('#plusMinus10')[0].checked ^ checkEventAltMode(e));
		if (v.maxIn) { val = Math.min(val, v.maxIn); }
		v.value = val;
		checkInVal(v);
	}).on('input', 'input:not([type])', _.debounce(function () {
		if (this.inputFn) {
			this.inputFn(this);
		} else {
			checkInVal(this);
		}
	}, 250));

	ele = $('#editTabs')[0].getElementsByClassName('tab');
	ele2 = $('#editTabDivs')[0].getElementsByClassName('tabDiv');
	if (!$('#editTabs')[0].getElementsByClassName('tabCurrent').length) {
		$(ele[0]).addClass('tabCurrent');
	}
	for (i = 0; i < ele.length; i++) {
		ele[i].tabDiv = ele2[i];
		if ($(ele[i]).hasClass('tabCurrent') && !CCalc.lastEditTab) {
			CCalc.lastEditTab = ele[i];
			show(ele2[i]);
		} else {
			$(ele[i]).removeClass('tabCurrent');
			hide(ele2[i]);
		}
	}
	$('#editTabs').on('click', '.tab:not(.tabCurrent)', function () {
		$(this).addClass('tabCurrent');
		show(this.tabDiv);
		$(CCalc.lastEditTab).removeClass('tabCurrent');
		hide(CCalc.lastEditTab.tabDiv);
		CCalc.lastEditTab = this;
	});

	$('#importField').on('blur', function () {
		this.value = this.value.replace(/\s/g, '');
	});
	$('#importButton').click(_.throttle(importSave, 500));
	$('#selImport').click(function () { $('#importField').select(); });
	$('#selExport').click(function () { $('#exportField').select(); });

	$('#warnCooksSpan').click(function () {
		var ele = $('#cookiesEarned')[0];
		setIn(ele, getIn(ele) +
			Math.max(CCalc.total.missCheat, CCalc.total.missCumu));
		calcEdit();
	});
	$('#warnCheat')[0].title = 'Cheated cookies taste awful!';
	$('#missCheatSpan').click(function () {
		var ele = $('#cookiesEarned')[0];
		setIn(ele, getIn(ele) + CCalc.total.missCheat);
		calcEdit();
	});
	$('#missCumuSpan').click(function () {
		var ele = $('#cookiesEarned')[0];
		setIn(ele, getIn(ele) + CCalc.total.missCumu);
		calcEdit();
	});

	$('#abbrCheck').click(function () {
		localStorage.CCalcAbbreviateNums = this.checked ? 1 : '';
		CCalc.abbrOn = this.checked;
		setShort();
	});
	$('#bakeryName').val(randomBakeryName()).blur(function () {
		this.value = this.value.replace(/\W/g, ' ');
	})[0].inputFn = function (ele) {
		if (!CCalc.Achieves['What\'s in a name'].owned) {
			var tmp = CCalc.changedBakeryName;
			CCalc.changedBakeryName = Boolean(ele.value);
			if (tmp !== CCalc.changedBakeryName) {
				calcEdit();
				return;
			}
		}
		exportSave();
	};
	$('#randomBakeryName').click(function () {
		$('#bakeryName').val(randomBakeryName());
		var call = exportSave;
		if (CCalc.changedBakeryName && !CCalc.Achieves['What\'s in a name'].owned) {
			call = calcEdit;
		}
		CCalc.changedBakeryName = false;
		call();
	});

	$('#recalcButton').click(_.throttle(calcEdit, 100));
	$('#chipsDesCooks').click(function () {
		if (CCalc.cookiesDesired > getIn('cookiesReset')) {
			setIn('#cookiesReset', CCalc.cookiesDesired);
			calcEdit();
		}
	});
	$('#idleGain').mouseover(function () {
		var gain = CCalc.total.cps *
			Math.max(_.now() - getIn('lastSavedTime'), 0) / 1000;
		this.title = '+' + beautifyAbbr(gain);
	}).click(function () {
		var curr = _.now(),
			gain = CCalc.total.cps * Math.max(curr - getIn('lastSavedTime'), 0) / 1000;
		setIn('#cookiesBank', getIn('cookiesBank') + gain);
		setIn('#cookiesEarned', getIn('cookiesEarned') + gain);
		setIn('#lastSavedTime', curr);
		calcEdit();
	});

	$('#gameOptions').on('click', 'a', function () {
		this.classList.toggle('on');
		exportSave();
	});

	$('#wrathSel').on('change', calcEdit);
	$('#researchClick').click(function (e) {
		if (CCalc.nextResearch !== '---') {
			if (checkEventAltMode(e)) {
				setUp(CCalc.nextResearch, 1);
				setIn('#researchTime', CCalc.nextResearchTime);
			}
			setUpLock(CCalc.nextResearch, true);
			calcEdit();
		}
	})[0].title = 'Click to unlock this;\n' +
		'ctrl-, alt-, or shift-click to purchase.';
	$('#researchTime')[0].maxIn = CCalc.maxResearchTime;
	$('#researchTimeClick').click(function () {
		var t = getIn('researchTime');
		if (CCalc.nextResearch !== '---' && t !== CCalc.nextResearchTime) {
			setIn('#researchTime', CCalc.nextResearchTime);
			calcEdit();
		}
	});
	$('#numPledges').checkfn = function () {
		CCalc.Upgrades['Elder Pledge'].setPrice();
		calcEdit();
	};
	$('#pledgeTime')[0].maxIn = CCalc.maxPledgeTime;
	$('#pledgeClick').click(function () {
		var ele = $('#pledgeTime')[0],
			p = getIn(ele);
		if (hasUp('Elder Pact') && p !== CCalc.nextPledgeTime) {
			if (p === 0) {
				setIn('#numPledges', getIn('numPledges') + 1);
				CCalc.Upgrades['Elder Pledge'].setPrice();
				popWrinklers();
			}
			setIn(ele, CCalc.nextPledgeTime);
			calcEdit();
		}
	});

	ele = '';
	for (i = 0; i <= 10; i++) { ele += '<option>' + i + '</option>'; }
	$('#numWrinklersSel').html(ele).on('change', calcEdit);
	eventfn = function () {
		popWrinklers();
		calcEdit();
	};
	$('#warnWrinklers').click(eventfn)
	[0].title = 'Wrinklers set when they wouldn\'t ' +
		'spawn ingame.\nClick to pop them.';
	$('#popWrinklers').click(eventfn);
	$('#cooksMunchedAdd').click(eventfn);

	ele = $('#versionIn')[0];
	ele.minIn = MinVersion;
	setIn(ele, Version);
	ele.placeholder = Version;
	$('#offVerse').text('Current: v.' + Version).click(function () {
		setIn('#versionIn', Version);
		calcEdit();
	});
	$('#timeHelp')[0].title = 'Times are in milliseconds since January 1, 1970,' +
		' 00:00:00 UTC.\nFor more information, click here.';
	$('#lastSavedCheck').click(exportSave);
	$('#lockCheckSpan')[0].title =
		'Ctrl-, alt-, and/or shift-click to do the opposite.';

	$('#santaLevel').append(CCalc.santaNames.map(
		function (s) { return $('<option>').text(s); })).on('change', calcEdit);
	$('#santaClick').click(function () {
		var s = $('#santaLevel')[0];
		if (hasUp('A festive hat') && s.selectedIndex &&
		s.selectedIndex < CCalc.santaMax) {
			s.options[s.selectedIndex + 1].selected = true;
		}
		calcEdit();
	});

	$('#seasonSel').on('change', function () {
		var f = $('#foolsNameCheck')[0],
			c = f.checked;
		f.checked = this.value === 'fools';
		if (f.checked !== c) { setBuildingNames(); }
		calcEdit();
	});
	$('#seasonSet').click(function () {
		hide(this);
		var s = $('#seasonSel')[0];
		if (s.value !== CCalc.lastSeason) {
			CCalc.lastSeason = s.value;
			setIn('#seasonTime', s.selectedIndex ? CCalc.maxSeasonTime : 0);
			if (s.selectedIndex) {
				setIn('#seasonCount', getIn('seasonCount') + 1);
				setSeasonPrices();
			}
			calcEdit();
		}
	});

	$('#seasonTime')[0].maxIn = CCalc.maxSeasonTime;
	$('#seasonTimeClick').click(function () {
		var s = $('#seasonSel')[0],
			t = getIn('seasonTime');
		hide(this);
		if (!s.selectedIndex && t) {
			setIn('#seasonTime', 0);
			exportSave();
		} else if (t < CCalc.maxSeasonTime &&
		s.value !== CCalc.defaultSeason) {
			setIn('#seasonTime', CCalc.maxSeasonTime);
			exportSave();
		}
		condShow('#seasonSet', s.selectedIndex);
	});
	$('#seasonCount').checkFn = function () {
		setSeasonPrices();
		calcEdit();
	};

	$('#foolsNameCheck').click(setBuildingNames);

	$('#upgradeLockAll').click(function () {
		$.each(CCalc.UpgradesById, function (i, u) {
			if (!u.req()) { setUpLock(i, false); }
		});
		calcEdit();
	});
	$('#upgradeDisableAll').click(function () {
		$.each(CCalc.UpgradesById, function (i) { setUp(i, false); });
		calcEdit();
	});
	$('#upgradeUnlockAll').click(function () {
		$.each(CCalc.UpgradesById, function (i, u) {
			if (!u.hidden && !u.debug) { setUpLock(i, true); }
		});
		calcEdit();
	});
	$('#upgradeEnableAll').click(function () {
		$.each(CCalc.UpgradesById, function (i, u) {
			if (!u.hidden && !u.debug && i != CCalc.CoveId) { setUp(i, true); }
		});
		calcEdit();
	});

	$('#upgradeIcons').on('click', '.crate', function (e) {
		var up = this.upObj,
			lock = $('#lockCheck')[0].checked ^ checkEventAltMode(e);
		if (lock) {
			if (!$(this).hasClass('unlocked') || !up.req()) { setUpLock(up.id); }
		} else {
			if (up.name === CCalc.nextResearch && !up.owned) {
				setIn('#researchTime', CCalc.nextResearchTime);
			}
			setUp(up.id);
			if (up.upPriceRed) { setUpPrices(); }
		}
		calcEdit();
	});

	$('#warnAchSpan, #achAward').click(function () {
		var t = CCalc.total.achs;
		if (t.length > 0) {
			$.each(t, function (i) { setAch(t[i], true); });
			calcEdit();
		}
	});

	$('#achDisableAll').click(function () {
		$.each(CCalc.AchievesById, function (i) { setAch(i, false); });
		calcEdit();
	});
	$('#achEnableAll').click(function () {
		$.each(CCalc.AchievesById, function (i) { setAch(i, true); });
		calcEdit();
	});
	$('#achIcons').on('click', '.crate', function () {
		setAch(this.achId);
		calcEdit();
	});

	$('.exp').focus(inBlur)
	.blur(function () { this.value = addCommas(getIn(this)); });

	eventfn = function () {
		var time =
			Math.floor((_.now() - getIn(this)) / 1000 * Fps),
			str = '';
		if (time >= Fps * 60 * 60 * 24 * 2) {
			str = beautify(Math.floor(time / (Fps * 60 * 60 * 24))) + ' days';
		} else if (time >= Fps * 60 * 60 * 24) {
			str = '1 day';
		} else if (time >= Fps * 60 * 60 * 2) {
			str = beautify(Math.floor(time / (Fps * 60 * 60))) + ' hours';
		} else if (time >= Fps * 60 * 60) {
			str = '1 hour';
		} else if (time >= Fps * 60 * 2) {
			str = beautify(Math.floor(time / (Fps * 60))) + ' minutes';
		} else if (time >= Fps * 60) {
			str = '1 minute';
		} else if (time >= Fps * 2) {
			str = beautify(Math.floor(time / (Fps))) + ' seconds';
		} else if (time >= Fps) {
			str = '1 second';
		}
		this.parentNode.title = str;
	};
	ele = $('input:not([type]):not(.text)').each(function () {
		if ($(this).hasClass('exp')) {
			this.setAttribute('spellcheck', false);
			this.setTitle = inTitleExp;
		} else {
			if (!/build/.test(this.id)) { $(this).blur(inBlur); }
		}
		if (this.disabled) {
			this.disClick = false;
			$(this.parentNode.parentNode).click(disClick.bind(this));
			$(this).blur(disBlur);
		}
		if ($(this).hasClass('date')) {
			setIn(this, CCalc.calcTime);
			$(this.parentNode).mouseover(eventfn.bind(this));
			this.setTitle = eventfn.bind(this);
		} else {
			if (this.hasAttribute('maxlength') && !this.minIn) {
				this.maxIn = Math.pow(10, this.getAttribute('maxlength')) - 1;
			}
		}
		if (!CCalc.cache.inputVals[this.id]) { setIn(this, this.value || 0); }
		if (!this.placeholder) { this.placeholder = 0; }
	});

	$('select:disabled').each(function () {
		this.disClick = false;
		$(this.parentNode.parentNode).click(disClick.bind(this));
		$(this).on('blur', disBlur);
	});

	calcEdit();
	show(document.forms[0]);
	$('#load').remove();
}, 100));