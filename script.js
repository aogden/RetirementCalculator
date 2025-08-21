        // --- DOM Elements ---
        const resultsTitle = document.getElementById('results-title');
        const resultsDiv = document.getElementById('results');
        const chartCanvas = document.getElementById('savingsChart');
        const retirementAgeSlider = document.getElementById('retirementAge');
        const retirementAgeValue = document.getElementById('retirementAgeValue');
        const currentAgeInput = document.getElementById('currentAge');
        const dataTableContainer = document.getElementById('data-table-container');
        const form = document.getElementById('calculator-form');
        const addChildBtn = document.getElementById('addChildBtn');
        const childrenContainer = document.getElementById('children-container');
        let savingsChart = null;
        let childCount = 0;

        // --- Cookie Functions ---
        function setCookie(name, value, days) {
            let expires = "";
            if (days) {
                const date = new Date();
                date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
                expires = "; expires=" + date.toUTCString();
            }
            document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Lax";
        }

        function getCookie(name) {
            const nameEQ = name + "=";
            const ca = document.cookie.split(';');
            for (let i = 0; i < ca.length; i++) {
                let c = ca[i];
                while (c.charAt(0) == ' ') c = c.substring(1, c.length);
                if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
            }
            return null;
        }

        function saveInputsToCookies() {
            const inputs = form.querySelectorAll('input');
            inputs.forEach(input => {
                setCookie(input.id, input.value, 365);
            });
            setCookie('childCount', childCount, 365);
        }

        function loadInputsFromCookies() {
            const savedChildCount = parseInt(getCookie('childCount') || '0');
            for (let i = 0; i < savedChildCount; i++) {
                addChild();
            }
            const inputs = form.querySelectorAll('input');
            inputs.forEach(input => {
                const cookieValue = getCookie(input.id);
                if (cookieValue !== null) {
                    input.value = cookieValue;
                    if (input.type === 'range') {
                        retirementAgeValue.textContent = cookieValue;
                    }
                }
            });
        }

        // --- Main Calculation Logic ---
        function getInputs() {
            const children = [];
            document.querySelectorAll('.child-cost-group').forEach(group => {
                const yearInput = group.querySelector('input[id^="child"][id$="CollegeYear"]');
                const costInput = group.querySelector('input[id^="child"][id$="CollegeCost"]');
                children.push({
                    year: parseInt(yearInput.value),
                    cost: parseFloat(costInput.value)
                });
            });

             return {
                currentAge: parseInt(document.getElementById('currentAge').value),
                retirementAge: parseInt(document.getElementById('retirementAge').value),
                lifeExpectancy: parseInt(document.getElementById('lifeExpectancy').value),
                currentRetirementSavings: parseFloat(document.getElementById('currentRetirementSavings').value),
                annualRetirementContribution: parseFloat(document.getElementById('annualRetirementContribution').value),
                currentTaxableSavings: parseFloat(document.getElementById('currentTaxableSavings').value),
                annualTaxableContribution: parseFloat(document.getElementById('annualTaxableContribution').value),
                annualReturn: parseFloat(document.getElementById('annualReturn').value) / 100,
                postRetirementReturn: parseFloat(document.getElementById('postRetirementReturn').value) / 100,
                inflationRate: parseFloat(document.getElementById('inflationRate').value) / 100,
                annualSpending: parseFloat(document.getElementById('annualSpending').value),
                capitalGainsTaxRate: parseFloat(document.getElementById('capitalGainsTaxRate').value) / 100,
                retirementTaxRate: parseFloat(document.getElementById('retirementTaxRate').value) / 100,
                socialSecurityAge: parseInt(document.getElementById('socialSecurityAge').value),
                monthlySocialSecurity: parseFloat(document.getElementById('monthlySocialSecurity').value),
                housePayoffAge: parseInt(document.getElementById('housePayoffAge').value),
                monthlyMortgage: parseFloat(document.getElementById('monthlyMortgage').value),
                primaryResidenceValue: parseFloat(document.getElementById('primaryResidenceValue').value),
                children: children
            };
        }

        function runAllScenarios() {
            const baseInputs = getInputs();
            if (Object.values(baseInputs).some(val => val === null || (typeof val === 'number' && isNaN(val))) || baseInputs.retirementAge <= baseInputs.currentAge || baseInputs.lifeExpectancy <= baseInputs.retirementAge) {
                console.error("Invalid input. Please check all fields.");
                return;
            }

            saveInputsToCookies();

            const scenarios = ['worst', 'moderate', 'best'];
            const results = {};

            scenarios.forEach(scenario => {
                const scenarioInputs = JSON.parse(JSON.stringify(baseInputs));
                switch(scenario) {
                    case 'worst':
                        scenarioInputs.annualReturn -= 0.02;
                        scenarioInputs.postRetirementReturn -= 0.02;
                        scenarioInputs.inflationRate += 0.015;
                        scenarioInputs.lifeExpectancy += 5;
                        break;
                    case 'best':
                        scenarioInputs.annualReturn += 0.02;
                        scenarioInputs.postRetirementReturn += 0.02;
                        scenarioInputs.inflationRate -= 0.01;
                        break;
                }
                const simulationResult = runFullLifecycleSimulation(scenarioInputs);
                const totalYears = scenarioInputs.lifeExpectancy - scenarioInputs.currentAge;
                const finalEstateToday = calculatePresentValue(simulationResult.finalEstate, scenarioInputs.inflationRate, totalYears);
                results[scenario] = {
                    ...simulationResult,
                    finalEstateToday: finalEstateToday
                };
            });

            displayAllResults(results);
            renderCombinedChart(results, baseInputs);
            renderDataTable(results.moderate.yearlyData, baseInputs); // Still show moderate case for data table
        }

        // --- Event Listeners ---
        form.addEventListener('change', runAllScenarios);
        
        retirementAgeSlider.addEventListener('input', () => {
            retirementAgeValue.textContent = retirementAgeSlider.value;
            runAllScenarios();
        });

        addChildBtn.addEventListener('click', () => {
            addChild();
            runAllScenarios();
        });

        function addChild() {
            childCount++;
            const childDiv = document.createElement('div');
            childDiv.className = 'child-cost-group space-y-6 border-t pt-6';
            childDiv.innerHTML = `
                <div class="flex justify-between items-center">
                    <h4 class="font-semibold text-gray-700">Child ${childCount}</h4>
                    <button type="button" class="remove-child-btn text-xs text-red-500 hover:text-red-700 font-semibold">Remove</button>
                </div>
                <div class="input-group">
                    <label for="child${childCount}CollegeYear" class="input-label">College Start Year</label>
                    <input type="number" id="child${childCount}CollegeYear" value="${new Date().getFullYear() + 18}" class="w-full px-4 py-3 border border-gray-300 rounded-lg">
                </div>
                <div class="input-group">
                    <label for="child${childCount}CollegeCost" class="input-label">Total Cost (Today's $)</label>
                    <input type="number" id="child${childCount}CollegeCost" value="150000" class="w-full px-4 py-3 border border-gray-300 rounded-lg">
                </div>
            `;
            childrenContainer.appendChild(childDiv);
            childDiv.querySelector('.remove-child-btn').addEventListener('click', (e) => {
                e.target.closest('.child-cost-group').remove();
                runAllScenarios();
            });
        }


        function runFullLifecycleSimulation(inputs) {
            let retirementBalance = inputs.currentRetirementSavings;
            let taxableBalance = inputs.currentTaxableSavings;
            let propertyValue = inputs.primaryResidenceValue;
            const yearlyData = [{ 
                year: inputs.currentAge, 
                retirement: retirementBalance,
                taxable: taxableBalance,
                property: propertyValue
            }];
            let nestEggAtRetirement = 0;

            for (let age = inputs.currentAge + 1; age <= inputs.lifeExpectancy; age++) {
                const isPreRetirement = age <= inputs.retirementAge;
                const currentReturnRate = isPreRetirement ? inputs.annualReturn : inputs.postRetirementReturn;
                propertyValue *= (1 + inputs.inflationRate);

                if (isPreRetirement) {
                    let effectiveTaxableContribution = inputs.annualTaxableContribution;
                    if (age > inputs.housePayoffAge) {
                        effectiveTaxableContribution += inputs.monthlyMortgage * 12;
                    }
                    retirementBalance += inputs.annualRetirementContribution;
                    taxableBalance += effectiveTaxableContribution;
                }

                const retirementGain = retirementBalance * currentReturnRate;
                retirementBalance += retirementGain;
                const taxableGain = taxableBalance * currentReturnRate;
                taxableBalance += taxableGain;
                
                if (isPreRetirement && taxableGain > 0) {
                    taxableBalance -= taxableGain * inputs.capitalGainsTaxRate;
                }

                inputs.children.forEach(child => {
                    const currentYear = new Date().getFullYear() + (age - inputs.currentAge);
                    if (currentYear >= child.year && currentYear < child.year + 4) {
                        const annualCost = child.cost / 4;
                        const yearsToInflate = age - inputs.currentAge;
                        const inflatedCost = annualCost * Math.pow(1 + inputs.inflationRate, yearsToInflate);
                        
                        const fromTaxable = Math.min(taxableBalance, inflatedCost);
                        taxableBalance -= fromTaxable;
                        const remainingCost = inflatedCost - fromTaxable;

                        if (remainingCost > 0) {
                            const fromRetirement = Math.min(retirementBalance, remainingCost);
                            retirementBalance -= fromRetirement;
                        }
                    }
                });

                if (!isPreRetirement) {
                    const yearsSinceStart = age - inputs.currentAge;
                    let spendingNeeded = inputs.annualSpending * Math.pow(1 + inputs.inflationRate, yearsSinceStart);

                    if (age >= inputs.socialSecurityAge) {
                        const inflatedSS = (inputs.monthlySocialSecurity * 12) * Math.pow(1 + inputs.inflationRate, yearsSinceStart);
                        spendingNeeded -= inflatedSS;
                    }
                    spendingNeeded = Math.max(0, spendingNeeded);

                    const fromTaxable = Math.min(taxableBalance, spendingNeeded);
                    taxableBalance -= fromTaxable;
                    const remainingSpending = spendingNeeded - fromTaxable;

                    if (remainingSpending > 0) {
                        const grossWithdrawal = remainingSpending / (1 - inputs.retirementTaxRate);
                        const fromRetirement = Math.min(retirementBalance, grossWithdrawal);
                        retirementBalance -= fromRetirement;
                    }
                }
                
                const totalLiquidBalance = retirementBalance + taxableBalance;
                yearlyData.push({ 
                    year: age, 
                    retirement: retirementBalance,
                    taxable: taxableBalance,
                    property: propertyValue
                });

                if (age === inputs.retirementAge) {
                    nestEggAtRetirement = totalLiquidBalance;
                }
                
                if (totalLiquidBalance < 0) {
                    for (let fillAge = age + 1; fillAge <= inputs.lifeExpectancy; fillAge++) {
                         yearlyData.push({ 
                            year: fillAge, 
                            retirement: 0,
                            taxable: 0,
                            property: propertyValue * Math.pow(1 + inputs.inflationRate, fillAge - age)
                        });
                    }
                    break;
                }
            }

            const finalLiquidEstate = Math.max(0, retirementBalance + taxableBalance);
            const finalEstate = finalLiquidEstate + propertyValue;

            return { yearlyData, nestEggAtRetirement, finalEstate };
        }
        
        function calculatePresentValue(futureValue, rate, years) {
            return futureValue / Math.pow(1 + rate, years);
        }

        function displayAllResults(results) {
            Object.keys(results).forEach(scenario => {
                const finalEstateFutureEl = document.getElementById(`finalEstateFuture-${scenario}`);
                const finalEstateTodayEl = document.getElementById(`finalEstateToday-${scenario}`);
                
                finalEstateFutureEl.textContent = formatCurrency(results[scenario].finalEstate);
                finalEstateTodayEl.textContent = `${formatCurrency(results[scenario].finalEstateToday)} (in Today's Dollars)`;
            });
            resultsDiv.classList.add('visible');
        }

        function renderCombinedChart(results, inputs) {
            const labels = results.moderate.yearlyData.map(d => d.year);
            const datasets = Object.keys(results).map(scenario => {
                const data = results[scenario].yearlyData.map((d, i) => calculatePresentValue(d.retirement + d.taxable + d.property, inputs.inflationRate, i));
                let color;
                switch(scenario) {
                    case 'worst': color = '#ef4444'; break;
                    case 'moderate': color = '#3b82f6'; break;
                    case 'best': color = '#22c55e'; break;
                }
                return {
                    label: `${scenario.charAt(0).toUpperCase() + scenario.slice(1)} Case`,
                    data: data,
                    borderColor: color,
                    backgroundColor: `${color}1a`,
                    fill: true,
                    tension: 0.2,
                    pointRadius: 0,
                    borderWidth: 3,
                };
            });

            if (savingsChart) {
                savingsChart.destroy();
            }

            const retirementIndex = labels.indexOf(inputs.retirementAge);
            const mortgagePayoffIndex = labels.indexOf(inputs.housePayoffAge);
            
            const annotations = {
                retirementLine: {
                    type: 'line',
                    xMin: retirementIndex,
                    xMax: retirementIndex,
                    borderColor: 'rgb(239, 68, 68)',
                    borderWidth: 2,
                    borderDash: [6, 6],
                    label: { content: 'Retirement', display: true, position: 'start', backgroundColor: 'rgba(239, 68, 68, 0.8)' }
                },
                mortgagePayoffLine: {
                    type: 'line',
                    xMin: mortgagePayoffIndex,
                    xMax: mortgagePayoffIndex,
                    borderColor: 'rgb(34, 197, 94)',
                    borderWidth: 2,
                    borderDash: [6, 6],
                    label: { content: 'Mortgage Paid Off', display: true, position: 'end', yAdjust: -20, backgroundColor: 'rgba(34, 197, 94, 0.8)' }
                }
            };

            inputs.children.forEach((child, index) => {
                const currentYear = new Date().getFullYear();
                const ageAtCollegeStart = child.year - currentYear + inputs.currentAge;
                const childIndex = labels.indexOf(ageAtCollegeStart);
                annotations[`child${index+1}CollegeLine`] = {
                    type: 'line',
                    xMin: childIndex,
                    xMax: childIndex,
                    borderColor: index === 0 ? 'rgb(249, 115, 22)' : 'rgb(168, 85, 247)',
                    borderWidth: 2,
                    borderDash: [6, 6],
                    label: { content: `Child ${index+1} College`, display: true, position: 'end', yAdjust: index * 40, backgroundColor: index === 0 ? 'rgba(249, 115, 22, 0.8)' : 'rgba(168, 85, 247, 0.8)' }
                }
            });

            const ctx = chartCanvas.getContext('2d');
            savingsChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: { 
                            beginAtZero: true, 
                            ticks: { callback: value => formatCurrency(value) },
                            stacked: false,
                        },
                        x: { 
                            title: { display: true, text: 'Age' },
                            stacked: false,
                        }
                    },
                    plugins: {
                        title: {
                            display: true,
                            text: "Net Worth Projection (in Today's Dollars)"
                        },
                        tooltip: { 
                            mode: 'index',
                            intersect: false,
                            callbacks: { label: context => `${context.dataset.label}: ${formatCurrency(context.parsed.y)}` } 
                        },
                        annotation: {
                            annotations: annotations
                        }
                    }
                }
            });
        }
        
        function renderDataTable(yearlyData, inputs) {
            let tableHTML = `
                <h3 class="text-xl font-bold text-center mb-4">Year-by-Year Projection (Moderate Case, Today's Dollars)</h3>
                <div class="max-h-96 overflow-y-auto">
                    <table class="w-full text-sm text-left text-gray-500">
                        <thead class="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
                            <tr>
                                <th scope="col" class="py-3 px-6">Age</th>
                                <th scope="col" class="py-3 px-6">Liquid Assets</th>
                                <th scope="col" class="py-3 px-6">Retirement Assets</th>
                                <th scope="col" class="py-3 px-6">Total Net Worth</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            yearlyData.forEach((d, i) => {
                const todayLiquid = calculatePresentValue(d.taxable, inputs.inflationRate, i);
                const todayRetirement = calculatePresentValue(d.retirement, inputs.inflationRate, i);
                const todayNetWorth = calculatePresentValue(d.taxable + d.retirement + d.property, inputs.inflationRate, i);

                tableHTML += `
                    <tr class="bg-white border-b hover:bg-gray-50">
                        <th scope="row" class="py-4 px-6 font-medium text-gray-900 whitespace-nowrap">${d.year}</th>
                        <td class="py-4 px-6">${formatCurrency(todayLiquid)}</td>
                        <td class="py-4 px-6">${formatCurrency(todayRetirement)}</td>
                        <td class="py-4 px-6 font-bold">${formatCurrency(todayNetWorth)}</td>
                    </tr>
                `;
            });

            tableHTML += `
                        </tbody>
                    </table>
                </div>
            `;
            dataTableContainer.innerHTML = tableHTML;
        }

        function formatCurrency(value) {
            return new Intl.NumberFormat('en-US', {
                style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0
            }).format(value);
        }
        
        // Initial page load
        window.addEventListener('DOMContentLoaded', () => {
            loadInputsFromCookies();
            runAllScenarios();
        });
