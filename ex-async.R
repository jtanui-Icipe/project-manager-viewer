myArgs <- commandArgs(trailingOnly = TRUE)
function_choice <- myArgs[1]

# add your R functions here

eval(parse(text=function_choice))