const CONSTANTS = {
  id: "heart-containers",
  title: "Heart Containers",
  SETTING: {
    ENABLE: "enabled",
    ICON: "icon",
    SHOWN: "shown",
    SIZE: "size",
    PATHS: {
      VALUE: "value",
      MAX: "max",
      TEMP: "temp",
      TEMPMAX: "tempmax",
    },
  },
};

/* -------------------------------------------------- */

/**
 * Register settings.
 */
function registerSettings() {
  // The path to current hit points value, max, temp, and tempmax.
  ["value", "max", "temp", "tempmax"].forEach(p => {
    game.settings.register(CONSTANTS.id, CONSTANTS.SETTING.PATHS[p.toUpperCase()], {
      name: `HEART_CONTAINERS.SettingsPathName${p.capitalize()}`,
      hint: `HEART_CONTAINERS.SettingsPathName${p.capitalize()}Hint`,
      scope: "world",
      config: true,
      type: String,
      default: `system.attributes.hp.${p}`,
    });
  });

  // Setting to change the icon.
  game.settings.register(CONSTANTS.id, CONSTANTS.SETTING.ICON, {
    name: "HEART_CONTAINERS.SettingsFontAwesomeIcon",
    hint: "HEART_CONTAINERS.SettingsFontAwesomeIconHint",
    scope: "world",
    config: true,
    type: String,
    default: "fa-heart",
  });

  // Invisible setting to remember if heart containers are toggled on.
  game.settings.register(CONSTANTS.id, CONSTANTS.SETTING.SHOWN, {
    scope: "client",
    config: false,
    type: Boolean,
    default: true,
    onChange: value => ui.heartContainers.element.classList.toggle("active"),
  });

  // Client-side setting to permanently disable heart containers.
  game.settings.register(CONSTANTS.id, CONSTANTS.SETTING.ENABLE, {
    name: "HEART_CONTAINERS.SettingsEnableHeartContainers",
    hint: "HEART_CONTAINERS.SettingsEnableHeartContainersHint",
    scope: "client",
    config: true,
    type: Boolean,
    default: true,
    requiresReload: true,
  });

  // Amount of hit points per heart container.
  game.settings.register(CONSTANTS.id, CONSTANTS.SETTING.SIZE, {
    name: "HEART_CONTAINERS.SettingsContainerSize",
    hint: "HEART_CONTAINERS.SettingsContainerSizeHint",
    scope: "client",
    config: true,
    type: new foundry.data.fields.NumberField({ min: 1, max: 100, integer: true, nullable: false }),
    default: 10,
  });
}

/* -------------------------------------------------- */

const { HandlebarsApplicationMixin, Application } = foundry.applications.api;

class HeartContainers extends HandlebarsApplicationMixin(Application) {
  /** @inheritdoc */
  static DEFAULT_OPTIONS = {
    id: "heart-containers",
    tag: "aside",
    window: {
      frame: false,
      positioned: false,
    },
    actions: {
      toggle: HeartContainers.#toggle,
    },
  };

  /* -------------------------------------------------- */

  /** @inheritdoc */
  static PARTS = {
    root: {
      template: "modules/heart-containers/templates/heart-containers.hbs",
      root: true,
    },
  };

  /* -------------------------------------------------- */

  /**
   * Get the user's character.
   * @returns {foundry.documents.Actor|null}   The user's assigned actor.
   */
  get actor() {
    return game.user.character;
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _prepareContext(options) {
    if (!this.actor) return { noActor: true };

    const paths = {
      value: game.settings.get(CONSTANTS.id, CONSTANTS.SETTING.PATHS.VALUE),
      max: game.settings.get(CONSTANTS.id, CONSTANTS.SETTING.PATHS.MAX),
      temp: game.settings.get(CONSTANTS.id, CONSTANTS.SETTING.PATHS.TEMP),
      tempmax: game.settings.get(CONSTANTS.id, CONSTANTS.SETTING.PATHS.TEMPMAX),
    };

    const hp = ["value", "max", "temp", "tempmax"].reduce((acc, property) => {
      const value = foundry.utils.getProperty(this.actor, paths[property]);
      if ((value === undefined) && ["value", "max"].includes(property)) {
        throw new Error("No proper path set for current and max hit points!");
      }
      acc[property] = value || null;
      return acc;
    }, {});

    // Size and icon of hearts.
    const unit = game.settings.get(CONSTANTS.id, CONSTANTS.SETTING.SIZE);
    const icon = game.settings.get(CONSTANTS.id, CONSTANTS.SETTING.ICON) || "fa-heart";

    // The total number of hearts.
    const total = Math.ceil((hp.max + hp.tempmax) / unit);
    const hearts = [];
    for (let i = 1; i <= total; i++) {
      const isEmpty = i > Math.ceil(hp.value / unit);
      const pulse = !isEmpty && (i + 1 > Math.ceil(hp.value / unit));
      const isYellow = i > total - Math.ceil(hp.tempmax / unit);
      const isRed = i <= Math.ceil(Math.min(hp.value, hp.max) / unit);

      const cssClass = [
        "heart",
        "icon",
        icon,
        isEmpty ? "fa-regular" : "fa-solid",
        isEmpty ? "empty" : null,
        isYellow ? "tempmax" : isRed ? "value" : "black",
        pulse ? "fa-beat" : null,
      ].filterJoin(" ");
      hearts.push(cssClass);
    }
    const tempHearts = Array.fromRange(Math.ceil(hp.temp / unit)).map(() => {
      return ["heart", "icon", "fa-solid", icon].join(" ");
    });

    return { hearts, tempHearts };
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  async _onFirstRender(context, options) {
    await super._onFirstRender(context, options);
    this.actor.apps[this.id] = this;
    const active = game.settings.get(CONSTANTS.id, CONSTANTS.SETTING.SHOWN);
    if (active) this.element.classList.add("active");
  }

  /* -------------------------------------------------- */

  /** @inheritdoc */
  _insertElement(element) {
    const existing = document.getElementById(element.id);
    if (existing) existing.replaceWith(element);
    else document.getElementById("ui-left-column-2").insertAdjacentElement("afterend", element);
  }

  /* -------------------------------------------------- */
  /*   Event handlers                                   */
  /* -------------------------------------------------- */

  /**
   * Handle toggling the 'active' class on the button to hide/show the hearts.
   * @this {HeartContainers}
   * @param {PointerEvent} event    The initiating click event.
   * @param {HTMLButtonElement} target    The element that defined the [data-action].
   */
  static #toggle(event, target) {
    const current = game.settings.get(CONSTANTS.id, CONSTANTS.SETTING.SHOWN);
    game.settings.set(CONSTANTS.id, CONSTANTS.SETTING.SHOWN, !current);
  }
}

Hooks.once("init", () => {
  registerSettings();
  CONFIG.ui.heartContainers = HeartContainers;
});
Hooks.once("ready", () => {
  if (!game.settings.get(CONSTANTS.id, CONSTANTS.SETTING.ENABLE)) return;
  ui.heartContainers.render({ force: true });
});
