/**
 * This module implements form persistence across sessions via local storage.
 * * Register a form for persistence with `FormPersistence#persist(form)`.
 * * Save a form to local storage with `FormPersistence#save(form)`.
 * * Load a saved form (e.g. at window load time) with `FormPersistence#load(form, valueFunctions)`.
 * 
 * Uses module pattern per https://yuiblog.com/blog/2007/06/12/module-pattern/.
 */
let FormPersistence = (() => {
    /**
     * Registers the given form for persistence and saves its data to local storage upon submission.
     * 
     * @param {HTMLFormElement} form The form to make persistent.
     */
    function persist(form) {
        form.addEventListener('submit', () => save(form))
    }

    /**
     * Saves the given form to local storage.
     * 
     * @param {HTMLFormElement} form The form to serialize to local storage.
     */
    function save(form) {
        let data = {}
        let formData = new FormData(form)
        for (let key of formData.keys()) {
            data[key] = formData.getAll(key)
        }
        localStorage.setItem(getStorageKey(form), JSON.stringify(data))
    }

    /**
     * Loads a given form from local storage, optionally with given special value handling functions.
     * Does nothing if no saved values are found.
     * 
     * @param {HTMLFormElement} form           The form to load saved values into.
     * @param {Object}          valueFunctions The special value functions, like `name: fn(form, value)`.
     */
    function load(form, valueFunctions) {
        let json = localStorage.getItem(getStorageKey(form))
        if (json) {
            let data = JSON.parse(json)
            // apply given value functions first
            let speciallyHandled = []
            if (valueFunctions !== undefined) {
                speciallyHandled = applySpecialHandlers(data, form, valueFunctions)
            }
            // fill remaining values normally
            for (let name in data) {
                if (!speciallyHandled.includes(name)) {
                    // TODO cleanup
                    let inputs = document.querySelectorAll(
                        'form#' + form.id + ' input[name="' + name + '"],' +
                        'form#' + form.id + ' textarea[name="' + name + '"],' +
                        'form#' + form.id + ' select[name="' + name + '"],' +
                        'input[name="' + name + '"][form="' + form.id + '"],' +
                        'textarea[name="' + name + '"][form="' + form.id + '"],' +
                        'select[name="' + name + '"][form="' + form.id + '"]'
                    )
                    inputs.forEach((input, i) => {
                        let tag = input.tagName
                        if (tag === 'INPUT') {
                            let type = input.type
                            if (type === 'radio') {
                                if (input.value === data[name][0] && !input.checked) {
                                    input.click()
                                }
                            } else if (type === 'checkbox') {
                                let shouldBeChecked = input.value === data[name][i]
                                if (shouldBeChecked !== input.checked) {
                                    input.click()
                                }
                            } else {
                                input.value = data[name][i]
                            }
                        } else if (tag === 'TEXTAREA') {
                            input.value = data[name][i]
                        } else if (tag === 'SELECT') {
                            if (input.multiple) {
                                for (let option of input.options) {
                                    option.selected = data[name].includes(option.value)
                                }
                            } else {
                                input.value = data[name][i]
                            }
                        }
                    })
                }
            }
        }
    }

    /**
     * Runs given value handling functions in place of basic value insertion.
     * 
     * @param {Object}          data           The form data being loaded.
     * @param {HTMLFormElement} form           The HTML form being loaded.
     * @param {Object}          valueFunctions The special value functions, like `name: fn(form, value)`.
     * 
     * @return {Array} An array containing the data entry names that were handled.
     */
    function applySpecialHandlers(data, form, valueFunctions) {
        let speciallyHandled = []
        for (let fnName in valueFunctions) {
            if (fnName in data) {
                for (let value of data[fnName]) {
                    valueFunctions[fnName](form, value)
                }
                speciallyHandled.push(fnName)
            }
        }
        return speciallyHandled
    }

    /**
     * Creates a local storage key for the given form.
     * 
     * @param {HTMLFormElement} form The form to create a storage key for.
     */
    function getStorageKey(form) {
        return 'form#' + form.id
    }

    /**
     * Return the public interface of FormPersistence.
     */
    return {
        persist: persist,
        load: load,
        save: save
    }
})()