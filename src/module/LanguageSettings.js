export class PolyglotLanguageSettings extends FormApplication {
	/**
	 * Default Options for this FormApplication
	 */
	static get defaultOptions() {
		const classes = ["sheet", "polyglot", "polyglot-language-settings"];
		if (game.system.id === "wfrp4e") {
			classes.push(game.system.id);
		}
		return mergeObject(super.defaultOptions, {
			id: "polyglot-language-form",
			title: "Polyglot Language Settings",
			template: "./modules/polyglot/templates/LanguageSettings.hbs",
			classes,
			width: 600,
			height: 680,
			closeOnSubmit: true,
			resizable: true,
		});
	}

	getData() {
		const data = {};
		const selectedProvider = game.polyglot.languageProvider.id;
		// Insert all speed providers into the template data
		data.providers = Object.values(game.polyglot.api.providers).map((languageProvider) => {
			const provider = {};
			provider.id = languageProvider.id;
			let dotPosition = provider.id.indexOf(".");
			if (dotPosition === -1) dotPosition = provider.id.length;
			const type = provider.id.substring(0, dotPosition);
			const id = provider.id.substring(dotPosition + 1);
			if (type === "native") {
				let title = id === game.system.id ? game.system.title : id;
				provider.selectTitle = (
					`${game.i18n.localize("POLYGLOT.LanguageProvider.choices.native")
					} ${
					title}`
				).trim();
			} else {
				const name = type === "module" ? game.modules.get(id).title : game.system.title;
				provider.selectTitle = game.i18n.format(`POLYGLOT.LanguageProvider.choices.${type}`, { name });
			}
			provider.isSelected = provider.id === selectedProvider;
			return provider;
		});

		data.providerSelection = {
			id: "languageProvider",
			name: game.i18n.localize("POLYGLOT.LanguageProvider.name"),
			hint: game.i18n.localize("POLYGLOT.LanguageProvider.hint"),
			type: String,
			choices: data.providers.reduce((choices, provider) => {
				choices[provider.id] = provider.selectTitle;
				return choices;
			}, {}),
			value: selectedProvider,
			isCheckbox: false,
			isSelect: true,
			isRange: false,
		};

		this.languageProvider = data.providerSelection.value;

		function prepSetting(key) {
			const { name, hint } = game.settings.settings.get(`polyglot.${key}`);
			const value = game.settings.get("polyglot", `${key}`);
			return { value, name, hint };
		}

		const asArray = Object.entries(game.settings.get("polyglot", "Languages"));

		const { name, hint } = game.settings.settings.get("polyglot.Languages");
		const filtered = asArray.filter(([key]) => {
			return (
				key !== game.polyglot.omniglot
				&& key !== game.polyglot.comprehendLanguages
				&& key !== game.polyglot.truespeech
			);
		});
		const value = Object.fromEntries(filtered);

		const languages = {
			name,
			hint,
			value,
		};

		const alphabets = prepSetting("Alphabets");

		return {
			data,
			languages,
			alphabets,
		};
	}

	async activateListeners(html) {
		super.activateListeners(html);
		html.find(".polyglot-languageProvider").on("change", (event) => {
			const languagesList = html.find(".polyglot-languages-list")[0];
			const languagesWarning = html.find(".polyglot-languages-warn")[0];
			const shouldDisplayLanguages = this.languageProvider === event.target.value;
			languagesList.style.display = shouldDisplayLanguages ? "block" : "none";
			languagesWarning.style.display = shouldDisplayLanguages ? "none" : "block";
		});
		html.find(".polyglot-alphabet").each(function () {
			const font = this.previousSibling.previousSibling.children[0].value; // selectatr's value
			this.style.font = game.polyglot.languageProvider.fonts[font];
		});
		html.find(".selectatr").on("change", (event) => {
			const font = event.target.value;
			const parentElement = event.target.parentElement;
			const nextSibling = parentElement.nextSibling;
			if (nextSibling && nextSibling.nextSibling) {
				const elementToChange = nextSibling.nextSibling;
				const alphabet = game.polyglot.languageProvider.fonts[font];
				elementToChange.style.font = alphabet;
			}
		});
		html.find("button").on("click", async (event) => {
			if (event.currentTarget?.dataset?.action === "reset") {
				await game.settings.set("polyglot", "Languages", {});
				const defaultProvider = new game.polyglot.languageProvider.constructor();
				defaultProvider.getLanguages();
				await game.settings.set("polyglot", "Languages", defaultProvider.languages);
				this.close();
			}
		});
	}

	/**
	 * Executes on form submission
	 * @param {Event} ev - the form submission event
	 * @param {Object} formData - the form data
	 */
	async _updateObject(ev, formData) {
		const languageProvider = game.settings.get("polyglot", "languageProvider");
		if (languageProvider !== formData.languageProvider) {
			await game.settings.set("polyglot", "languageProvider", formData.languageProvider);
			game.polyglot.api.updateProvider();
			await game.settings.set("polyglot", "Alphabets", game.polyglot.languageProvider.fonts);
			await game.settings.set("polyglot", "Languages", game.polyglot.languageProvider.languages);
			SettingsConfig.reloadConfirm({ world: true });
		} else {
			const langSettings = duplicate(game.settings.get("polyglot", "Languages"));
			const fonts = formData["language.alphabet"];
			const rng = formData["language.rng"];
			let i = 0;
			for (let lang in langSettings) {
				langSettings[lang].font = fonts[i];
				langSettings[lang].rng = rng[i];
				i++;
			}
			let current = game.settings.get("polyglot", "Languages");
			if (langSettings === current) return;
			game.polyglot.languageProvider.languages = langSettings;
			await game.settings.set("polyglot", "Languages", langSettings);
			SettingsConfig.reloadConfirm({ world: true });
		}
	}
}
