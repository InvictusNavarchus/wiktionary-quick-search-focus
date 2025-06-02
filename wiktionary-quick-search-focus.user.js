// ==UserScript==
// @name         Wiktionary Quick Search Focus
// @namespace    https://github.com/InvictusNavarchus/wiktionary-quick-search-focus
// @icon         https://www.wiktionary.org/favicon.ico
// @icon64       https://www.wiktionary.org/favicon-64x64.png
// @supportURL   https://github.com/InvictusNavarchus/wiktionary-quick-search-focus/issues
// @downloadURL  https://raw.githubusercontent.com/InvictusNavarchus/wiktionary-quick-search-focus/master/wiktionary-quick-search-focus.user.js
// @updateURL    https://raw.githubusercontent.com/InvictusNavarchus/wiktionary-quick-search-focus/master/wiktionary-quick-search-focus.user.js
// @version      0.1.0
// @description  Focuses Wiktionary search bar on keypress, appends key, and handles dynamic input recreation.
// @author       InvictusNavarchus
// @match        https://*.wiktionary.org/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    let currentSearchInput = null;

    // Function to find the Wiktionary search input element
    // It tries to find the initial ID, then the selector for the Vue-based recreated input.
    function findSearchInputElement() {
        // Try the original ID first (seen in the initial HTML structure)
        let searchInput = document.getElementById('searchInput');
        if (searchInput) {
            return searchInput;
        }

        // Try the selector for the recreated Vue component's input
        // This targets the input within the form inside the #p-search container
        searchInput = document.querySelector('#p-search form#searchform input.cdx-text-input__input[name="search"]');
        if (searchInput) {
            return searchInput;
        }

        // A slightly more general selector if the form ID changes but class and name remain
        searchInput = document.querySelector('#p-search .cdx-typeahead-search__form input.cdx-text-input__input[name="search"]');
         if (searchInput) {
            return searchInput;
        }

        // Fallback: sometimes the ID 'searchInput' might be on the new input directly under #p-search
        searchInput = document.querySelector('#p-search #searchInput');
        if (searchInput) {
            return searchInput;
        }

        // Broader selector for the input if other specific parts change
        searchInput = document.querySelector('#p-search input[name="search"][type="search"]');
        return searchInput;
    }

    // Function to update the reference to the current search input
    function updateCurrentSearchInput() {
        const newSearchInput = findSearchInputElement();
        if (newSearchInput !== currentSearchInput) {
            // console.log('Wiktionary Quick Search: Search input updated.', newSearchInput);
            currentSearchInput = newSearchInput;
        }
    }

    // Event listener for keydown events on the entire document
    document.addEventListener('keydown', function(event) {
        // Ignore if modifier keys are pressed (Ctrl, Alt, Shift, Meta)
        if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) {
            return;
        }

        // Ignore Enter key (let it perform its default action, e.g., submit form)
        if (event.key === 'Enter') {
            return;
        }

        // Ignore if the event target is already an input, textarea, select element, or contentEditable
        const targetTagName = event.target.tagName;
        if (targetTagName === 'INPUT' || targetTagName === 'TEXTAREA' || targetTagName === 'SELECT' || event.target.isContentEditable) {
            return;
        }

        // Process only single character keys (letters, numbers, symbols)
        if (event.key && event.key.length === 1) {
            // Ensure we have the latest search input reference
            if (!currentSearchInput || !document.body.contains(currentSearchInput)) {
                updateCurrentSearchInput();
            }

            if (currentSearchInput) {
                event.preventDefault(); // Prevent default action for the key press (e.g., page scroll, browser shortcuts)

                // Focus the search input if it's not already focused
                if (document.activeElement !== currentSearchInput) {
                    currentSearchInput.focus();
                }

                // Insert the character at the current cursor position
                const start = currentSearchInput.selectionStart;
                const end = currentSearchInput.selectionEnd;
                const value = currentSearchInput.value;

                currentSearchInput.value = value.substring(0, start) + event.key + value.substring(end);

                // Move cursor to after the inserted character
                const newCursorPos = start + event.key.length;
                currentSearchInput.setSelectionRange(newCursorPos, newCursorPos);

                // Dispatch an 'input' event to trigger any JavaScript listeners on the search box
                // (e.g., for auto-suggestions)
                currentSearchInput.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
            }
        }
    });

    // Set up a MutationObserver to watch for changes in the header (where the search box resides)
    // This helps in re-finding the search input if it's dynamically recreated by Wiktionary's scripts.
    const headerElement = document.querySelector('header.vector-header');
    if (headerElement) {
        const observer = new MutationObserver(function(mutationsList, observer) {
            // When mutations occur, try to update the search input reference.
            // A common mutation is the search component being re-rendered.
            for (const mutation of mutationsList) {
                if (mutation.type === 'childList') {
                    // Check if the #p-search element or its children were affected
                    let relevantChange = false;
                    if (mutation.target.id === 'p-search' || mutation.target.closest('#p-search')) {
                        relevantChange = true;
                    } else {
                        mutation.addedNodes.forEach(node => {
                            if (node.nodeType === Node.ELEMENT_NODE && (node.id === 'p-search' || node.querySelector('#p-search'))) {
                                relevantChange = true;
                            }
                        });
                         mutation.removedNodes.forEach(node => {
                            if (node.nodeType === Node.ELEMENT_NODE && (node.id === 'p-search' || node.querySelector('#p-search'))) {
                                relevantChange = true;
                            }
                        });
                    }
                    if(relevantChange) {
                        // console.log('Wiktionary Quick Search: Relevant DOM mutation detected.');
                        updateCurrentSearchInput();
                        break; // Found a relevant change, no need to check other mutations in this batch
                    }
                }
            }
        });

        observer.observe(headerElement, { childList: true, subtree: true });
        // console.log('Wiktionary Quick Search: MutationObserver attached to header.');
    } else {
        console.error('Wiktionary Quick Search: Header element (header.vector-header) not found for MutationObserver.');
    }

    // Initial attempt to find the search input when the script runs
    updateCurrentSearchInput();

    // Also, listen for focus events on any input to ensure currentSearchInput is up-to-date
    // if Wiktionary replaces it *after* our initial find but *before* a mutation is caught,
    // or if the user focuses it manually.
    document.addEventListener('focusin', (event) => {
        if (event.target && event.target.matches &&
            (event.target.matches('#searchInput') || event.target.matches('#p-search input[name="search"]'))) {
            if (event.target !== currentSearchInput) {
                // console.log('Wiktionary Quick Search: Search input focused, updating reference.');
                currentSearchInput = event.target;
            }
        }
    });

})();
