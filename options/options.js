var input_clear_all_intervals = document.getElementById("clear_all_intervals");

chrome_storage_get_attribute("clear_all_intervals", value => {
  input_clear_all_intervals.checked = value;
});

input_clear_all_intervals.onclick = function() {
  chrome_storage_set_attribute("clear_all_intervals", input_clear_all_intervals.checked);
}