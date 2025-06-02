// ==UserScript==
// @name         Wiktionary Quick Search Focus
// @namespace    https://github.com/InvictusNavarchus/wiktionary-quick-search-focus
// @icon         https://www.wiktionary.org/favicon.ico
// @icon64       https://www.wiktionary.org/favicon-64x64.png
// @supportURL   https://github.com/InvictusNavarchus/wiktionary-quick-search-focus/issues
// @downloadURL  https://raw.githubusercontent.com/InvictusNavarchus/wiktionary-quick-search-focus/master/wiktionary-quick-search-focus.user.js
// @updateURL    https://raw.githubusercontent.com/InvictusNavarchus/wiktionary-quick-search-focus/master/wiktionary-quick-search-focus.user.js
// @version      0.3.0
// @description  Focuses Wiktionary search bar on keypress, appends key, handles dynamic input recreation, and clears input on next keypress if not manually focused.
// @author       InvictusNavarchus
// @match        https://*.wiktionary.org/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    let currentSearchInput = null;
    let shouldClearOnNextKeypress = false;

    // Initialize logging
    console.log('Wiktionary Quick Search Focus: Script initialized');

    /**
     * Function to find the Wiktionary search input element
     * It tries to find the initial ID, then the selector for the Vue-based recreated input.
     * @returns {HTMLElement|null} The search input element or null if not found
     */
    function findSearchInputElement() {
        console.log('Wiktionary Quick Search: Searching for search input element...');
        // Try the original ID first (seen in the initial HTML structure)
        let searchInput = document.getElementById('searchInput');
        if (searchInput) {
            console.log('Wiktionary Quick Search: Found search input using original ID selector');
            return searchInput;
        }

        // Try the selector for the recreated Vue component's input
        // This targets the input within the form inside the #p-search container
        searchInput = document.querySelector('#p-search form#searchform input.cdx-text-input__input[name="search"]');
        if (searchInput) {
            console.log('Wiktionary Quick Search: Found search input using Vue form selector');
            return searchInput;
        }

        // A slightly more general selector if the form ID changes but class and name remain
        searchInput = document.querySelector('#p-search .cdx-typeahead-search__form input.cdx-text-input__input[name="search"]');
         if (searchInput) {
            console.log('Wiktionary Quick Search: Found search input using typeahead form selector');
            return searchInput;
        }

        // Fallback: sometimes the ID 'searchInput' might be on the new input directly under #p-search
        searchInput = document.querySelector('#p-search #searchInput');
        if (searchInput) {
            console.log('Wiktionary Quick Search: Found search input using p-search ID fallback');
            return searchInput;
        }

        // Broader selector for the input if other specific parts change
        searchInput = document.querySelector('#p-search input[name="search"][type="search"]');
        if (searchInput) {
            console.log('Wiktionary Quick Search: Found search input using broad selector');
        } else {
            console.warn('Wiktionary Quick Search: No search input element found with any selector');
        }
        return searchInput;
    }

    /**
     * Function to update the reference to the current search input
     */
    function updateCurrentSearchInput() {
        console.log('Wiktionary Quick Search: Updating search input reference...');
        const newSearchInput = findSearchInputElement();
        if (newSearchInput !== currentSearchInput) {
            console.log('Wiktionary Quick Search: Search input updated.', {
                oldInput: currentSearchInput,
                newInput: newSearchInput,
                newInputId: newSearchInput?.id,
                newInputClasses: newSearchInput?.className
            });
            currentSearchInput = newSearchInput;
        } else {
            console.log('Wiktionary Quick Search: Search input reference unchanged');
        }
    }

    // Event listener for keydown events on the entire document
    document.addEventListener('keydown', function(event) {
        console.log('Wiktionary Quick Search: Keydown event detected', {
            key: event.key,
            code: event.code,
            target: event.target.tagName,
            targetId: event.target.id,
            metaKey: event.metaKey,
            ctrlKey: event.ctrlKey,
            altKey: event.altKey,
            shiftKey: event.shiftKey
        });

        // Ignore if modifier keys are pressed (Ctrl, Alt, Shift, Meta)
        if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
            console.log('Wiktionary Quick Search: Ignoring keydown - modifier key pressed');
            return;
        }

        // Ignore Enter key (let it perform its default action, e.g., submit form)
        if (event.key === 'Enter') {
            console.log('Wiktionary Quick Search: Ignoring keydown - Enter key');
            return;
        }

        // Ignore if the event target is already an input, textarea, select element, or contentEditable
        const targetTagName = event.target.tagName;
        if (targetTagName === 'INPUT' || targetTagName === 'TEXTAREA' || targetTagName === 'SELECT' || event.target.isContentEditable) {
            console.log('Wiktionary Quick Search: Ignoring keydown - target is already an input element', {
                tagName: targetTagName,
                isContentEditable: event.target.isContentEditable
            });
            return;
        }

        // Process only single character keys (letters, numbers, symbols)
        if (event.key && event.key.length === 1) {
            console.log('Wiktionary Quick Search: Processing single character key:', event.key);
            
            // Ensure we have the latest search input reference
            if (!currentSearchInput || !document.body.contains(currentSearchInput)) {
                console.log('Wiktionary Quick Search: Search input not found or not in DOM, updating reference');
                updateCurrentSearchInput();
            }

            if (currentSearchInput) {
                console.log('Wiktionary Quick Search: Search input found, processing keypress');
                event.preventDefault(); // Prevent default action for the key press (e.g., page scroll, browser shortcuts)

                // Focus the search input if it's not already focused
                if (document.activeElement !== currentSearchInput) {
                    console.log('Wiktionary Quick Search: Auto-focusing search input');
                    currentSearchInput.focus();
                    // Set flag to clear input on next keypress since user didn't manually focus
                    shouldClearOnNextKeypress = true;
                } else {
                    console.log('Wiktionary Quick Search: Search input already focused');
                    // User has manually focused on the input, don't clear on next keypress
                    shouldClearOnNextKeypress = false;
                }

                // Clear the input if this is the next keypress after auto-focusing
                if (shouldClearOnNextKeypress) {
                    console.log('Wiktionary Quick Search: Clearing input before inserting character');
                    currentSearchInput.value = '';
                    shouldClearOnNextKeypress = false;
                }

                // Insert the character at the current cursor position
                const start = currentSearchInput.selectionStart;
                const end = currentSearchInput.selectionEnd;
                const value = currentSearchInput.value;

                console.log('Wiktionary Quick Search: Inserting character', {
                    character: event.key,
                    cursorStart: start,
                    cursorEnd: end,
                    currentValue: value
                });

                currentSearchInput.value = value.substring(0, start) + event.key + value.substring(end);

                // Move cursor to after the inserted character
                const newCursorPos = start + event.key.length;
                currentSearchInput.setSelectionRange(newCursorPos, newCursorPos);

                console.log('Wiktionary Quick Search: Character inserted, new value:', currentSearchInput.value);

                // Dispatch an 'input' event to trigger any JavaScript listeners on the search box
                // (e.g., for auto-suggestions)
                currentSearchInput.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
                console.log('Wiktionary Quick Search: Input event dispatched');
            } else {
                console.warn('Wiktionary Quick Search: No search input found, cannot process keypress');
            }
        } else {
            console.log('Wiktionary Quick Search: Ignoring non-single-character key:', event.key);
        }
    });

    // Set up a MutationObserver to watch for changes in the header (where the search box resides)
    // This helps in re-finding the search input if it's dynamically recreated by Wiktionary's scripts.
    const headerElement = document.querySelector('header.vector-header');
    if (headerElement) {
        console.log('Wiktionary Quick Search: Header element found, setting up MutationObserver');
        const observer = new MutationObserver(function(mutationsList, observer) {
            console.log('Wiktionary Quick Search: DOM mutations detected', mutationsList.length);
            // When mutations occur, try to update the search input reference.
            // A common mutation is the search component being re-rendered.
            for (const mutation of mutationsList) {
                if (mutation.type === 'childList') {
                    // Check if the #p-search element or its children were affected
                    let relevantChange = false;
                    if (mutation.target.id === 'p-search' || mutation.target.closest('#p-search')) {
                        console.log('Wiktionary Quick Search: Mutation detected in p-search element');
                        relevantChange = true;
                    } else {
                        mutation.addedNodes.forEach(node => {
                            if (node.nodeType === Node.ELEMENT_NODE && (node.id === 'p-search' || node.querySelector('#p-search'))) {
                                console.log('Wiktionary Quick Search: p-search element added to DOM');
                                relevantChange = true;
                            }
                        });
                         mutation.removedNodes.forEach(node => {
                            if (node.nodeType === Node.ELEMENT_NODE && (node.id === 'p-search' || node.querySelector('#p-search'))) {
                                console.log('Wiktionary Quick Search: p-search element removed from DOM');
                                relevantChange = true;
                            }
                        });
                    }
                    if(relevantChange) {
                        console.log('Wiktionary Quick Search: Relevant DOM mutation detected, updating search input reference');
                        updateCurrentSearchInput();
                        break; // Found a relevant change, no need to check other mutations in this batch
                    }
                }
            }
        });

        observer.observe(headerElement, { childList: true, subtree: true });
        console.log('Wiktionary Quick Search: MutationObserver attached to header');
    } else {
        console.error('Wiktionary Quick Search: Header element (header.vector-header) not found for MutationObserver');
    }

    // Initial attempt to find the search input when the script runs
    console.log('Wiktionary Quick Search: Performing initial search input discovery');
    updateCurrentSearchInput();

    // Also, listen for focus events on any input to ensure currentSearchInput is up-to-date
    // if Wiktionary replaces it *after* our initial find but *before* a mutation is caught,
    // or if the user focuses it manually.
    document.addEventListener('focusin', (event) => {
        if (event.target && event.target.matches &&
            (event.target.matches('#searchInput') || event.target.matches('#p-search input[name="search"]'))) {
            console.log('Wiktionary Quick Search: Focus event detected on search input', {
                targetId: event.target.id,
                targetClasses: event.target.className,
                isSameElement: event.target === currentSearchInput
            });
            if (event.target !== currentSearchInput) {
                console.log('Wiktionary Quick Search: Search input focused, updating reference');
                currentSearchInput = event.target;
            }
            // Reset the clear flag when user manually focuses on the search input
            shouldClearOnNextKeypress = false;
            console.log('Wiktionary Quick Search: Clear flag reset due to manual focus');
        }
    });

    console.log('Wiktionary Quick Search Focus: Script setup completed successfully');

})();
