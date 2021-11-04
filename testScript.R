# Import packages

# Data manipulation and cleaning
library(dplyr)
library(tidyr)

# Handlong missing values
library(naniar)

# Stata data export
library(haven)

# Importing any kind of data
library(rio)

# Disable scientific format
options(scipen=999)

# Set to current working directory
library(here)

df2<-read.csv('D:\\Development\\Projects\\Baseline SCLAMP\\Data_Version_2\\Maize_Variety_grown.csv')
df2%>%
  glimpse()
df_joined<-df2%>%
s <- strsplit(df2$reason_for_growing_variety, split = " ")
mutate_if(is.character, as.factor)
#data.frame(PARENT_KEY = rep(df$PARENT_KEY, sapply(s, length)), reason_for_growing_variety = unlist(s))


write_dta(df2, "D:\\Development\\splitted234.dta", version = 13)


