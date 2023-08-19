class HeartContainers extends Application {
  /**
   * @constructor
   * @param {User} user     The current user.
   */
  constructor(user) {
    super();
    this.user = user;
  }

  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      resizeable: false,
      popOut: false,
      minimizable: false,
      id: "heart-containers-application",
      template: "modules/heart-containers/templates/heart-containers.hbs"
    });
  }

  /**
   * Get the character of the related user.
   * @returns {Actor}     The user's assigned actor.
   */
  get actor() {
    return this.user.character;
  }

  /** @override */
  async getData() {
    const hp = foundry.utils.deepClone(this.actor.system.attributes.hp);

    // Whether to initially show.
    const active = game.settings.get(this.MODULE.ID, this.MODULE.SETTING.SHOWN);
    const size = game.settings.get(this.MODULE.ID, this.MODULE.SETTING.SIZE);
    const unit = (Number.isNumeric(size) && (size > 0)) ? size : 10;

    // The total number of hearts.
    const total = Math.ceil((hp.max + hp.tempmax) / unit);
    const hearts = [];
    for (let i = 1; i <= total; i++) {
      const isEmpty = i > Math.ceil(hp.value / unit);
      const pulse = !isEmpty && (i + 1 > Math.ceil(hp.value / unit));
      const data = {
        isYellow: i > total - Math.ceil(hp.tempmax / unit),
        isEmpty,
        pulse,
        isRed: i <= Math.ceil(Math.min(hp.value, hp.max) / unit)
      };
      hearts.push(data);
    }
    const tempHearts = Array(Math.ceil(hp.temp / unit)).fill(0);

    return {hearts, tempHearts, active};
  }

  /** @override */
  render(force = false, options = {}) {
    this.actor.apps[this.appId] = this;
    return super.render(force, options);
  }

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);
    html[0].querySelector("[data-action='toggle']").addEventListener("click", this._onToggle.bind(this));
  }

  /**
   * Handle toggling the 'active' class on the button to hide/show the hearts.
   * @param {PointerEvent} event      The initiating click event.
   */
  _onToggle(event) {
    game.settings.set(this.MODULE.ID, this.MODULE.SETTING.SHOWN, event.currentTarget.classList.toggle("active"));
  }

  /**
   * Initial rendering method for this application.
   * @returns {HeartContainers}     An instance of this application.
   */
  static createApplication() {
    if (!game.settings.get(HeartContainers.MODULE.ID, HeartContainers.MODULE.SETTING.ENABLE)) return;
    if (game.user.character) return new HeartContainers(game.user).render(true);
  }

  /** Module constants. */
  static get MODULE() {
    return {
      ID: "heart-containers",
      TITLE: "Heart Containers",
      SETTING: {
        ENABLE: "enabled",
        SHOWN: "shown",
        SIZE: "size"
      }
    };
  };
  get MODULE() {
    return this.constructor.MODULE;
  }

  /**
   * Register settings.
   */
  static registerSettings() {
    // Invisible setting to remember if heart containers are toggled on.
    game.settings.register(HeartContainers.MODULE.ID, HeartContainers.MODULE.SETTING.SHOWN, {
      scope: "client",
      config: false,
      type: Boolean,
      default: true
    });

    // Client-side setting to permanently disable heart containers.
    game.settings.register(HeartContainers.MODULE.ID, HeartContainers.MODULE.SETTING.ENABLE, {
      name: "HEART_CONTAINERS.SettingsEnableHeartContainers",
      hint: "HEART_CONTAINERS.SettingsEnableHeartContainersHint",
      scope: "client",
      config: true,
      type: Boolean,
      default: true,
      requiresReload: true
    });

    // Amount of hit points per heart container.
    game.settings.register(HeartContainers.MODULE.ID, HeartContainers.MODULE.SETTING.SIZE, {
      name: "HEART_CONTAINERS.SettingsContainerSize",
      hint: "HEART_CONTAINERS.SettingsContainerSizeHint",
      scope: "client",
      config: true,
      type: Number,
      default: 10
    });
  }
}

Hooks.once("init", HeartContainers.registerSettings);
Hooks.once("ready", HeartContainers.createApplication);
